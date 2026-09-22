import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CanvasBlock } from '@/types/notes';

interface AutoScrollOptions {
  edgeThreshold?: number;
  maxSpeed?: number;
  minSpeed?: number;
  canvasPadding?: number;
}

export function useCanvasDragAutoScroll(
  blocks: CanvasBlock[],
  options: AutoScrollOptions = {}
) {
  const {
    edgeThreshold = 80,
    maxSpeed = 24,
    minSpeed = 3,
    canvasPadding = 900,
  } = options;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasContentRef = useRef<HTMLDivElement | null>(null);

  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragExtendOffset, setDragExtendOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse / Pointer position tracking during drag
  const currentPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);

  // Pan / Canvas navigation state
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  // Calculate dynamic canvas size with generous OneNote padding
  const canvasDimensions = useMemo(() => {
    let maxX = 1200;
    let maxY = 800;

    if (blocks.length > 0) {
      for (const b of blocks) {
        const w = typeof b.width === 'number' ? b.width : parseInt(String(b.width), 10) || 450;
        const h = typeof b.height === 'number' ? b.height : parseInt(String(b.height), 10) || 300;
        if (b.x + w > maxX) maxX = b.x + w;
        if (b.y + h > maxY) maxY = b.y + h;
      }
    }

    // Include real-time drag expansion if dragging far right or down
    if (dragExtendOffset.x > maxX) maxX = dragExtendOffset.x;
    if (dragExtendOffset.y > maxY) maxY = dragExtendOffset.y;

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

    // Proximity to Left Edge
    const distLeft = clientX - rect.left;
    if (distLeft < edgeThreshold && container.scrollLeft > 0) {
      const factor = Math.max(0, 1 - Math.max(0, distLeft) / edgeThreshold);
      scrollDeltaX = -(minSpeed + factor * (maxSpeed - minSpeed));
    }

    // Proximity to Right Edge
    const distRight = rect.right - clientX;
    if (distRight < edgeThreshold) {
      const factor = Math.max(0, 1 - Math.max(0, distRight) / edgeThreshold);
      scrollDeltaX = minSpeed + factor * (maxSpeed - minSpeed);
    }

    // Proximity to Top Edge
    const distTop = clientY - rect.top;
    if (distTop < edgeThreshold && container.scrollTop > 0) {
      const factor = Math.max(0, 1 - Math.max(0, distTop) / edgeThreshold);
      scrollDeltaY = -(minSpeed + factor * (maxSpeed - minSpeed));
    }

    // Proximity to Bottom Edge
    const distBottom = rect.bottom - clientY;
    if (distBottom < edgeThreshold) {
      const factor = Math.max(0, 1 - Math.max(0, distBottom) / edgeThreshold);
      scrollDeltaY = minSpeed + factor * (maxSpeed - minSpeed);
    }

    if (scrollDeltaX !== 0 || scrollDeltaY !== 0) {
      container.scrollLeft += scrollDeltaX;
      container.scrollTop += scrollDeltaY;
    }

    // Continue loop while active
    autoScrollRafRef.current = requestAnimationFrame(runAutoScrollLoop);
  }, [edgeThreshold, maxSpeed, minSpeed]);

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
  const handleBlockDragStart = useCallback((blockId: string, e?: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    setIsDraggingBlock(true);
    setActiveDragId(blockId);

    if (e) {
      if ('clientX' in e) {
        currentPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
      } else if ('touches' in e && e.touches && e.touches[0]) {
        currentPointerRef.current = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
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
    const targetRight = data.x + blockWidth + 300;
    const targetBottom = data.y + blockHeight + 300;

    setDragExtendOffset((prev) => {
      let nextX = prev.x;
      let nextY = prev.y;
      if (targetRight > prev.x) nextX = targetRight;
      if (targetBottom > prev.y) nextY = targetBottom;
      if (nextX !== prev.x || nextY !== prev.y) {
        return { x: nextX, y: nextY };
      }
      return prev;
    });

    startAutoScroll();
  }, [startAutoScroll]);

  const handleBlockDragStop = useCallback((
    blockId: string,
    data: { x: number; y: number },
    updateBlock: (id: string, updates: Partial<CanvasBlock>) => void
  ) => {
    setIsDraggingBlock(false);
    setActiveDragId(null);
    stopAutoScroll();

    // Ensure block stays in valid canvas coordinates (non-negative, minimal top margin)
    const clampedX = Math.max(0, Math.round(data.x));
    const clampedY = Math.max(12, Math.round(data.y));

    updateBlock(blockId, {
      x: clampedX,
      y: clampedY,
    });
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
  }, [isSpacePressed]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStartRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    e.preventDefault();
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    container.scrollLeft = panStartRef.current.scrollLeft - dx;
    container.scrollTop = panStartRef.current.scrollTop - dy;
  }, [isPanning]);

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
    isDraggingBlock,
    activeDragId,
    isSpacePressed,
    isPanning,
    handleBlockDragStart,
    handleBlockDrag,
    handleBlockDragStop,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  };
}
