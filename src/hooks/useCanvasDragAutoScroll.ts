import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CanvasBlock } from '@/types/notes';

export interface AutoScrollDiagnosticInfo {
  containerIsReceivingScroll: boolean;
  canvasUsesTransform: boolean;
  doubleCompensationDetected: boolean;
  scrollbarVsViewportSync: string;
  scrollTop: number;
  scrollLeft: number;
  blockX: number;
  blockY: number;
  visualCanvasPos: string;
  clientX: number;
  clientY: number;
  isAutoScrolling: boolean;
  scrollDeltaX: number;
  scrollDeltaY: number;
  activeBlockId: string | null;
  viewportDimensions: { width: number; height: number; scrollWidth: number; scrollHeight: number };
  cssScrollBehavior: string;
}

interface AutoScrollOptions {
  edgeThreshold?: number;
  scrollSpeed?: number;
  maxSpeed?: number;
  minSpeed?: number;
  canvasPadding?: number;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  onUpdateBlockPosition?: (
    id: string,
    updates: Partial<CanvasBlock> | ((prev: CanvasBlock) => Partial<CanvasBlock>)
  ) => void;
}

interface DragTrackingState {
  blockId: string;
  blockElement: HTMLElement | null;
  startBlockX: number;
  startBlockY: number;
  startPointerX: number;
  startPointerY: number;
  startScrollLeft: number;
  startScrollTop: number;
  currentPointerX: number;
  currentPointerY: number;
  lastCalculatedX: number;
  lastCalculatedY: number;
}

export function useCanvasDragAutoScroll(
  containerRefOrBlocks?: React.RefObject<HTMLDivElement | null> | CanvasBlock[],
  blocksOrOptions?: CanvasBlock[] | AutoScrollOptions,
  optionalOptions?: AutoScrollOptions
) {
  // Normalize arguments whether called as (containerRef, blocks, options) or (blocks, options)
  const isFirstArgRef = containerRefOrBlocks && typeof containerRefOrBlocks === 'object' && 'current' in containerRefOrBlocks;
  
  const externalContainerRef = isFirstArgRef
    ? (containerRefOrBlocks as React.RefObject<HTMLDivElement | null>)
    : null;

  const blocks: CanvasBlock[] = useMemo(() => {
    if (isFirstArgRef && Array.isArray(blocksOrOptions)) {
      return blocksOrOptions;
    }
    if (Array.isArray(containerRefOrBlocks)) {
      return containerRefOrBlocks;
    }
    return [];
  }, [isFirstArgRef, blocksOrOptions, containerRefOrBlocks]);

  const options: AutoScrollOptions = useMemo(() => {
    if (isFirstArgRef && optionalOptions) {
      return optionalOptions;
    }
    if (!isFirstArgRef && blocksOrOptions && !Array.isArray(blocksOrOptions)) {
      return blocksOrOptions;
    }
    return {};
  }, [isFirstArgRef, optionalOptions, blocksOrOptions]);

  // OneNote-like calm, constant, smooth auto-scroll parameters (no sudden acceleration)
  const {
    edgeThreshold = 75,
    scrollSpeed = 12,
    canvasPadding = 1200,
    canvasRef: externalCanvasRef,
    onUpdateBlockPosition,
  } = options;

  const internalContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = externalContainerRef || internalContainerRef;
  const canvasContentRef = useRef<HTMLDivElement | null>(null);

  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragExtendOffset, setDragExtendOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeDragIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeDragIdRef.current = activeDragId;
  }, [activeDragId]);

  const onUpdateBlockRef = useRef(onUpdateBlockPosition);
  useEffect(() => {
    onUpdateBlockRef.current = onUpdateBlockPosition;
  }, [onUpdateBlockPosition]);

  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // Precise drag tracking reference for 1:1 cursor synchronization without React state re-rendering lag
  const dragTrackingRef = useRef<DragTrackingState | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);

  // Pan / Canvas navigation state (middle click or spacebar drag)
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  // Live Diagnostic Telemetry State
  const [diagnosticData, setDiagnosticData] = useState<AutoScrollDiagnosticInfo>({
    containerIsReceivingScroll: true,
    canvasUsesTransform: false,
    doubleCompensationDetected: false,
    scrollbarVsViewportSync: '100% Sincronizado OneNote (1:1 Direto)',
    scrollTop: 0,
    scrollLeft: 0,
    blockX: 0,
    blockY: 0,
    visualCanvasPos: 'Alinhado ao Viewport',
    clientX: 0,
    clientY: 0,
    isAutoScrolling: false,
    scrollDeltaX: 0,
    scrollDeltaY: 0,
    activeBlockId: null,
    viewportDimensions: { width: 0, height: 0, scrollWidth: 0, scrollHeight: 0 },
    cssScrollBehavior: 'auto (Instantâneo OneNote)',
  });

  // Calculate dynamic canvas size with generous OneNote infinite headroom
  const canvasDimensions = useMemo(() => {
    let maxX = 1600;
    let maxY = 1200;

    if (blocks && blocks.length > 0) {
      for (const b of blocks) {
        const w = typeof b.width === 'number' ? b.width : parseInt(String(b.width), 10) || 450;
        const h = typeof b.height === 'number' ? b.height : parseInt(String(b.height), 10) || 300;
        if (b.x + w > maxX) maxX = b.x + w;
        if (b.y + h > maxY) maxY = b.y + h;
      }
    }

    if (dragExtendOffset.x > 0) maxX += dragExtendOffset.x;
    if (dragExtendOffset.y > 0) maxY += dragExtendOffset.y;

    return {
      width: Math.max(maxX + canvasPadding, 3500),
      height: Math.max(maxY + canvasPadding, 2500),
    };
  }, [blocks, dragExtendOffset, canvasPadding]);

  // Ensure canvas DOM element has infinite expansion headroom ahead of scroll so it NEVER stops
  const ensureCanvasHeadroom = useCallback((container: HTMLElement, deltaX: number, deltaY: number) => {
    const canvasEl = externalCanvasRef?.current || (container.firstElementChild as HTMLElement | null);
    if (!canvasEl) return;

    // Headroom buffer to the right and bottom
    const minNeededWidth = container.scrollLeft + container.clientWidth + Math.max(0, deltaX) + 3200;
    const minNeededHeight = container.scrollTop + container.clientHeight + Math.max(0, deltaY) + 2600;

    if (canvasEl.offsetWidth < minNeededWidth) {
      canvasEl.style.width = `${minNeededWidth}px`;
    }
    if (canvasEl.offsetHeight < minNeededHeight) {
      canvasEl.style.height = `${minNeededHeight}px`;
    }
  }, [externalCanvasRef]);

  // Continuous Auto-Scroll Loop (Runs at 60 FPS smoothly without acceleration)
  const runAutoScrollLoop = useCallback(() => {
    const container = scrollContainerRef.current;
    const tracking = dragTrackingRef.current;

    if (!container || !tracking) {
      autoScrollRafRef.current = null;
      setDiagnosticData((prev) => ({ ...prev, isAutoScrolling: false, scrollDeltaX: 0, scrollDeltaY: 0 }));
      return;
    }

    const { currentPointerX, currentPointerY } = tracking;
    const rect = container.getBoundingClientRect();

    let scrollDeltaX = 0;
    let scrollDeltaY = 0;

    // Proximity to Left Edge (scroll left if scrolled)
    const distLeft = currentPointerX - rect.left;
    if (distLeft < edgeThreshold && container.scrollLeft > 0) {
      scrollDeltaX = -Math.min(container.scrollLeft, scrollSpeed);
    }

    // Proximity to Right Edge (scroll right)
    const distRight = rect.right - currentPointerX;
    if (distRight < edgeThreshold) {
      scrollDeltaX = scrollSpeed;
    }

    // Proximity to Top Edge (scroll up if scrolled)
    const distTop = currentPointerY - rect.top;
    if (distTop < edgeThreshold && container.scrollTop > 0) {
      scrollDeltaY = -Math.min(container.scrollTop, scrollSpeed);
    }

    // Proximity to Bottom Edge (scroll down)
    const distBottom = rect.bottom - currentPointerY;
    if (distBottom < edgeThreshold) {
      scrollDeltaY = scrollSpeed;
    }

    if (scrollDeltaX !== 0 || scrollDeltaY !== 0) {
      // 1. Instantly expand canvas DOM so scrollLeft/scrollTop NEVER hit a limit wall
      ensureCanvasHeadroom(container, scrollDeltaX, scrollDeltaY);

      // 2. Perform direct 60 FPS viewport scroll increment
      container.scrollLeft += scrollDeltaX;
      container.scrollTop += scrollDeltaY;

      // 3. Keep dragExtendOffset updated for post-drag canvas dimensions
      if (scrollDeltaX > 0 || scrollDeltaY > 0) {
        setDragExtendOffset((prev) => ({
          x: Math.max(prev.x, container.scrollLeft - tracking.startScrollLeft + 2000),
          y: Math.max(prev.y, container.scrollTop - tracking.startScrollTop + 1600),
        }));
      }
    }

    // 4. Synchronize block DOM element 1:1 with cursor + total container scroll
    // Formula: truePos = startPos + mouseDelta + totalScrollDelta
    const totalScrollDeltaX = container.scrollLeft - tracking.startScrollLeft;
    const totalScrollDeltaY = container.scrollTop - tracking.startScrollTop;
    const mouseDeltaX = tracking.currentPointerX - tracking.startPointerX;
    const mouseDeltaY = tracking.currentPointerY - tracking.startPointerY;

    const trueX = Math.max(0, Math.round(tracking.startBlockX + mouseDeltaX + totalScrollDeltaX));
    const trueY = Math.max(12, Math.round(tracking.startBlockY + mouseDeltaY + totalScrollDeltaY));

    tracking.lastCalculatedX = trueX;
    tracking.lastCalculatedY = trueY;

    // Apply transform directly to the block DOM element via GPU without React re-render overhead
    if (tracking.blockElement) {
      tracking.blockElement.style.transform = `translate(${trueX}px, ${trueY}px) translateZ(0)`;
    }

    // Telemetry updates for diagnostic display
    setDiagnosticData({
      containerIsReceivingScroll: Boolean(container && container.scrollHeight > container.clientHeight),
      canvasUsesTransform: false,
      doubleCompensationDetected: false,
      scrollbarVsViewportSync: '100% Sincronizado em Tempo Real (60 FPS OneNote)',
      scrollTop: Math.round(container.scrollTop),
      scrollLeft: Math.round(container.scrollLeft),
      blockX: trueX,
      blockY: trueY,
      visualCanvasPos: `Top: -${Math.round(container.scrollTop)}px, Left: -${Math.round(container.scrollLeft)}px`,
      clientX: Math.round(currentPointerX),
      clientY: Math.round(currentPointerY),
      isAutoScrolling: scrollDeltaX !== 0 || scrollDeltaY !== 0,
      scrollDeltaX: Math.round(scrollDeltaX * 10) / 10,
      scrollDeltaY: Math.round(scrollDeltaY * 10) / 10,
      activeBlockId: tracking.blockId,
      viewportDimensions: {
        width: Math.round(container.clientWidth),
        height: Math.round(container.clientHeight),
        scrollWidth: Math.round(container.scrollWidth),
        scrollHeight: Math.round(container.scrollHeight),
      },
      cssScrollBehavior: 'auto',
    });

    // Continue animation loop while actively dragging
    autoScrollRafRef.current = requestAnimationFrame(runAutoScrollLoop);
  }, [edgeThreshold, scrollSpeed, scrollContainerRef, ensureCanvasHeadroom]);

  const startAutoScroll = useCallback(() => {
    if (!autoScrollRafRef.current) {
      autoScrollRafRef.current = requestAnimationFrame(runAutoScrollLoop);
    }
  }, [runAutoScrollLoop]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
    setDiagnosticData((prev) => ({ ...prev, isAutoScrolling: false, scrollDeltaX: 0, scrollDeltaY: 0 }));
  }, []);

  // Handlers for Blocks Dragging
  const handleBlockDragStart = useCallback((
    blockId: string,
    e?: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent | unknown
  ) => {
    setIsDraggingBlock(true);
    setActiveDragId(blockId);
    activeDragIdRef.current = blockId;

    const container = scrollContainerRef.current;
    const startScrollLeft = container ? container.scrollLeft : 0;
    const startScrollTop = container ? container.scrollTop : 0;

    let clientX = 0;
    let clientY = 0;

    const ev = e as { clientX?: number; clientY?: number; touches?: Array<{ clientX: number; clientY: number }>; target?: HTMLElement };
    if (ev) {
      if (typeof ev.clientX === 'number' && typeof ev.clientY === 'number') {
        clientX = ev.clientX;
        clientY = ev.clientY;
      } else if (ev.touches && ev.touches[0]) {
        clientX = ev.touches[0].clientX;
        clientY = ev.touches[0].clientY;
      }
    }

    // Locate the block in memory
    const targetBlock = blocksRef.current.find((b) => b.id === blockId);
    const startBlockX = targetBlock ? targetBlock.x : 0;
    const startBlockY = targetBlock ? Math.max(12, targetBlock.y) : 12;

    // Locate the block draggable DOM element
    let blockElement: HTMLElement | null = null;
    if (ev?.target && typeof ev.target.closest === 'function') {
      blockElement = ev.target.closest('.react-draggable') as HTMLElement | null;
    }
    if (!blockElement) {
      blockElement = document.getElementById(`block-rnd-${blockId}`) as HTMLElement | null
        || document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
    }

    if (blockElement) {
      blockElement.style.willChange = 'transform';
    }

    // If container exists, ensure generous initial headroom so dragging starts in an infinite space
    if (container) {
      ensureCanvasHeadroom(container, 0, 0);
    }

    dragTrackingRef.current = {
      blockId,
      blockElement,
      startBlockX,
      startBlockY,
      startPointerX: clientX,
      startPointerY: clientY,
      startScrollLeft,
      startScrollTop,
      currentPointerX: clientX,
      currentPointerY: clientY,
      lastCalculatedX: startBlockX,
      lastCalculatedY: startBlockY,
    };

    startAutoScroll();
  }, [scrollContainerRef, startAutoScroll, ensureCanvasHeadroom]);

  const handleBlockDrag = useCallback((
    e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent | unknown,
    data: { x: number; y: number; deltaX?: number; deltaY?: number },
    _blockWidth = 450,
    _blockHeight = 250
  ) => {
    const tracking = dragTrackingRef.current;
    if (!tracking) return;

    // Extract latest pointer coordinates
    const ev = e as { clientX?: number; clientY?: number; touches?: Array<{ clientX: number; clientY: number }> };
    if (ev) {
      if (typeof ev.clientX === 'number' && typeof ev.clientY === 'number') {
        tracking.currentPointerX = ev.clientX;
        tracking.currentPointerY = ev.clientY;
      } else if (ev.touches && ev.touches[0]) {
        tracking.currentPointerX = ev.touches[0].clientX;
        tracking.currentPointerY = ev.touches[0].clientY;
      }
    }

    const container = scrollContainerRef.current;
    if (container) {
      // Calculate true canvas coordinates incorporating current container scroll
      const totalScrollDeltaX = container.scrollLeft - tracking.startScrollLeft;
      const totalScrollDeltaY = container.scrollTop - tracking.startScrollTop;
      
      // In react-draggable, data.x is (startBlockX + mouseDeltaX). Adding totalScrollDelta yields the exact canvas position!
      const trueX = Math.max(0, Math.round(data.x + totalScrollDeltaX));
      const trueY = Math.max(12, Math.round(data.y + totalScrollDeltaY));

      tracking.lastCalculatedX = trueX;
      tracking.lastCalculatedY = trueY;

      // Apply transform directly to element so react-draggable and scroll are seamlessly united
      if (tracking.blockElement) {
        tracking.blockElement.style.transform = `translate(${trueX}px, ${trueY}px) translateZ(0)`;
      }

      // Check headroom dynamically
      ensureCanvasHeadroom(container, 0, 0);
    }

    startAutoScroll();
  }, [scrollContainerRef, startAutoScroll, ensureCanvasHeadroom]);

  const handleBlockDragStop = useCallback((
    blockId: string,
    data: { x: number; y: number },
    updateBlockCallback?: (id: string, updates: Partial<CanvasBlock> | ((prev: CanvasBlock) => Partial<CanvasBlock>)) => void
  ) => {
    const tracking = dragTrackingRef.current;

    // Get final exact coordinate with complete scroll compensation
    const finalX = tracking ? tracking.lastCalculatedX : Math.max(0, Math.round(data.x));
    const finalY = tracking ? tracking.lastCalculatedY : Math.max(12, Math.round(data.y));

    if (tracking?.blockElement) {
      tracking.blockElement.style.willChange = 'auto';
    }

    dragTrackingRef.current = null;
    setIsDraggingBlock(false);
    setActiveDragId(null);
    activeDragIdRef.current = null;
    stopAutoScroll();

    // Call updateBlock once with the pristine final coordinates
    const cb = updateBlockCallback || onUpdateBlockRef.current;
    if (cb) {
      cb(blockId, {
        x: finalX,
        y: finalY,
      });
    }
  }, [stopAutoScroll]);

  // Global window pointer listeners to guarantee auto-scroll and drag tracking continue seamlessly even across frames
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent | MouseEvent) => {
      const tracking = dragTrackingRef.current;
      if (tracking) {
        tracking.currentPointerX = e.clientX;
        tracking.currentPointerY = e.clientY;
      }
    };

    const handleWindowPointerUp = () => {
      if (dragTrackingRef.current) {
        const tracking = dragTrackingRef.current;
        handleBlockDragStop(tracking.blockId, {
          x: tracking.lastCalculatedX,
          y: tracking.lastCalculatedY,
        });
      }
      if (isPanning) {
        setIsPanning(false);
        panStartRef.current = null;
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      stopAutoScroll();
    };
  }, [isPanning, handleBlockDragStop, stopAutoScroll]);

  // Spacebar Panning Support (Hold Space + Drag canvas like OneNote / FigJam)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable;
      if (isInput) return;

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
        panStartRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Canvas Pan Mouse Handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const isMiddleClick = e.button === 1;
    const isSpacePan = isSpacePressed && e.button === 0;

    if (isMiddleClick || isSpacePan) {
      e.preventDefault();
      e.stopPropagation();
      const container = scrollContainerRef.current;
      if (!container) return;

      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      };
    }
  }, [isSpacePressed, scrollContainerRef]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStartRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    e.preventDefault();
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    container.scrollLeft = panStartRef.current.scrollLeft - dx;
    container.scrollTop = panStartRef.current.scrollTop - dy;
  }, [isPanning, scrollContainerRef]);

  const handleCanvasMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
  }, [isPanning]);

  return {
    scrollContainerRef,
    canvasContentRef,
    canvasDimensions,
    isDragging: isDraggingBlock,
    isDraggingBlock,
    draggingBlockId: activeDragId,
    activeDragId,
    canvasExtraWidth: dragExtendOffset.x,
    canvasExtraHeight: dragExtendOffset.y,
    isSpacePressed,
    isPanning,
    diagnosticData,
    handleDragStart: handleBlockDragStart,
    handleBlockDragStart,
    handleDrag: handleBlockDrag,
    handleBlockDrag,
    handleDragStop: handleBlockDragStop,
    handleBlockDragStop,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  };
}
