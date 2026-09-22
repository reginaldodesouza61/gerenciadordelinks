import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CanvasBlock } from '@/types/notes';

interface AutoScrollOptions {
  edgeThreshold?: number;
  maxSpeed?: number;
  minSpeed?: number;
  canvasPadding?: number;
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

  const {
    edgeThreshold = 90,
    maxSpeed = 28,
    minSpeed = 4,
    canvasPadding = 800,
  } = options;

  const internalContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = externalContainerRef || internalContainerRef;
  const canvasContentRef = useRef<HTMLDivElement | null>(null);

  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragExtendOffset, setDragExtendOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse / Pointer position tracking during drag
  const currentPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);

  // Pan / Canvas navigation state (middle click or spacebar drag)
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  // Calculate dynamic canvas size with generous OneNote padding
  const canvasDimensions = useMemo(() => {
    let maxX = 1200;
    let maxY = 800;

    if (blocks && blocks.length > 0) {
      for (const b of blocks) {
        const w = typeof b.width === 'number' ? b.width : parseInt(String(b.width), 10) || 450;
        const h = typeof b.height === 'number' ? b.height : parseInt(String(b.height), 10) || 300;
        if (b.x + w > maxX) maxX = b.x + w;
        if (b.y + h > maxY) maxY = b.y + h;
      }
    }

    // Include real-time drag expansion if dragging far right or down
    if (dragExtendOffset.x > 0) maxX += dragExtendOffset.x;
    if (dragExtendOffset.y > 0) maxY += dragExtendOffset.y;

    return {
      width: Math.max(maxX + canvasPadding, 1600),
      height: Math.max(maxY + canvasPadding, 1200),
    };
  }, [blocks, dragExtendOffset, canvasPadding]);

  // Continuous Auto-Scroll Loop
  const runAutoScrollLoop = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !currentPointerRef.current) {
      autoScrollRafRef.current = null;
      return;
    }

    const { clientX, clientY } = currentPointerRef.current;
    const rect = container.getBoundingClientRect();

    let scrollDeltaX = 0;
    let scrollDeltaY = 0;

    // Proximity to Left Edge (scroll left if scrolled)
    const distLeft = clientX - rect.left;
    if (distLeft < edgeThreshold && container.scrollLeft > 0) {
      const factor = Math.max(0, 1 - Math.max(0, distLeft) / edgeThreshold);
      scrollDeltaX = -(minSpeed + factor * (maxSpeed - minSpeed));
    }

    // Proximity to Right Edge (scroll right)
    const distRight = rect.right - clientX;
    if (distRight < edgeThreshold) {
      const factor = Math.max(0, 1 - Math.max(0, distRight) / edgeThreshold);
      scrollDeltaX = minSpeed + factor * (maxSpeed - minSpeed);
    }

    // Proximity to Top Edge (scroll up if scrolled)
    const distTop = clientY - rect.top;
    if (distTop < edgeThreshold && container.scrollTop > 0) {
      const factor = Math.max(0, 1 - Math.max(0, distTop) / edgeThreshold);
      scrollDeltaY = -(minSpeed + factor * (maxSpeed - minSpeed));
    }

    // Proximity to Bottom Edge (scroll down)
    const distBottom = rect.bottom - clientY;
    if (distBottom < edgeThreshold) {
      const factor = Math.max(0, 1 - Math.max(0, distBottom) / edgeThreshold);
      scrollDeltaY = minSpeed + factor * (maxSpeed - minSpeed);
    }

    if (scrollDeltaX !== 0 || scrollDeltaY !== 0) {
      container.scrollLeft += scrollDeltaX;
      container.scrollTop += scrollDeltaY;

      // Expand canvas ahead dynamically when scrolling near right/bottom edges
      if (scrollDeltaX > 0 || scrollDeltaY > 0) {
        setDragExtendOffset((prev) => ({
          x: scrollDeltaX > 0 ? prev.x + Math.round(scrollDeltaX * 1.5) : prev.x,
          y: scrollDeltaY > 0 ? prev.y + Math.round(scrollDeltaY * 1.5) : prev.y,
        }));
      }
    }

    // Continue animation loop while active
    autoScrollRafRef.current = requestAnimationFrame(runAutoScrollLoop);
  }, [edgeThreshold, maxSpeed, minSpeed, scrollContainerRef]);

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
    currentPointerRef.current = null;
  }, []);

  // Handlers for Blocks Dragging
  const handleBlockDragStart = useCallback((blockId: string, e?: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent | unknown) => {
    setIsDraggingBlock(true);
    setActiveDragId(blockId);

    const ev = e as { clientX?: number; clientY?: number; touches?: Array<{ clientX: number; clientY: number }> };
    if (ev) {
      if (typeof ev.clientX === 'number' && typeof ev.clientY === 'number') {
        currentPointerRef.current = { clientX: ev.clientX, clientY: ev.clientY };
      } else if (ev.touches && ev.touches[0]) {
        currentPointerRef.current = { clientX: ev.touches[0].clientX, clientY: ev.touches[0].clientY };
      }
    }
    startAutoScroll();
  }, [startAutoScroll]);

  const handleBlockDrag = useCallback((
    e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent | unknown,
    data: { x: number; y: number; deltaX?: number; deltaY?: number },
    blockWidth = 450,
    blockHeight = 250
  ) => {
    // Extract cursor coordinates
    const ev = e as { clientX?: number; clientY?: number; touches?: Array<{ clientX: number; clientY: number }> };
    if (ev) {
      if (typeof ev.clientX === 'number' && typeof ev.clientY === 'number') {
        currentPointerRef.current = { clientX: ev.clientX, clientY: ev.clientY };
      } else if (ev.touches && ev.touches[0]) {
        currentPointerRef.current = { clientX: ev.touches[0].clientX, clientY: ev.touches[0].clientY };
      }
    }

    // If block is dragged near or beyond canvas boundaries, extend virtual size dynamically
    const container = scrollContainerRef.current;
    if (container) {
      const scrollRight = container.scrollLeft + container.clientWidth;
      const scrollBottom = container.scrollTop + container.clientHeight;

      const targetX = data.x + blockWidth + 400;
      const targetY = data.y + blockHeight + 400;

      if (targetX > scrollRight || targetY > scrollBottom) {
        setDragExtendOffset((prev) => {
          const addX = Math.max(0, targetX - scrollRight);
          const addY = Math.max(0, targetY - scrollBottom);
          if (addX > prev.x || addY > prev.y) {
            return {
              x: Math.max(prev.x, addX),
              y: Math.max(prev.y, addY),
            };
          }
          return prev;
        });
      }
    }

    startAutoScroll();
  }, [scrollContainerRef, startAutoScroll]);

  const handleBlockDragStop = useCallback((
    blockId: string,
    data: { x: number; y: number },
    updateBlockCallback?: (id: string, updates: Partial<CanvasBlock>) => void
  ) => {
    setIsDraggingBlock(false);
    setActiveDragId(null);
    stopAutoScroll();

    // Ensure block stays in valid canvas coordinates
    const clampedX = Math.max(0, Math.round(data.x));
    const clampedY = Math.max(12, Math.round(data.y));

    if (updateBlockCallback) {
      updateBlockCallback(blockId, {
        x: clampedX,
        y: clampedY,
      });
    }

    // Reset temporary drag offsets gradually so canvas doesn't jerk
    setTimeout(() => {
      setDragExtendOffset({ x: 0, y: 0 });
    }, 150);
  }, [stopAutoScroll]);

  // Global window pointer listeners to guarantee auto-scroll stops even if pointer leaves window
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent | MouseEvent) => {
      if (isDraggingBlock) {
        currentPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
      }
    };

    const handleWindowPointerUp = () => {
      if (isDraggingBlock) {
        stopAutoScroll();
        setIsDraggingBlock(false);
        setActiveDragId(null);
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
  }, [isDraggingBlock, isPanning, stopAutoScroll]);

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
