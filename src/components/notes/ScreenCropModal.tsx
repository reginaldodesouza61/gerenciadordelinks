import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crop, Check, X, RotateCcw, ZoomIn, ZoomOut, Move, Scissors } from 'lucide-react';

interface ScreenCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawImageData: {
    dataUrl: string;
    width: number;
    height: number;
  } | null;
  onConfirmCrop: (croppedDataUrl: string, width: number, height: number) => void;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ScreenCropModal({
  open,
  onOpenChange,
  rawImageData,
  onConfirmCrop,
}: ScreenCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [crop, setCrop] = useState<CropRect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [displayScale, setDisplayScale] = useState({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, imgW: 0, imgH: 0 });

  // Update image layout dimensions relative to viewport
  const updateMetrics = useCallback(() => {
    if (!imageRef.current || !containerRef.current || !rawImageData) return;
    const imgRect = imageRef.current.getBoundingClientRect();
    const contRect = containerRef.current.getBoundingClientRect();

    const offsetX = imgRect.left - contRect.left;
    const offsetY = imgRect.top - contRect.top;
    const imgW = imgRect.width;
    const imgH = imgRect.height;

    const scaleX = rawImageData.width / (imgW || 1);
    const scaleY = rawImageData.height / (imgH || 1);

    setDisplayScale({ scaleX, scaleY, offsetX, offsetY, imgW, imgH });
  }, [rawImageData]);

  useEffect(() => {
    if (open) {
      setCrop(null);
      setIsDrawing(false);
      setStartPoint(null);
      // Wait for image to render and calculate bounds
      const timer = setTimeout(() => {
        updateMetrics();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open, rawImageData, updateMetrics]);

  useEffect(() => {
    window.addEventListener('resize', updateMetrics);
    return () => window.removeEventListener('resize', updateMetrics);
  }, [updateMetrics]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !imageRef.current) return;
    const contRect = containerRef.current.getBoundingClientRect();
    const imgRect = imageRef.current.getBoundingClientRect();

    // Bound to image rect
    const clickX = Math.max(imgRect.left, Math.min(imgRect.right, e.clientX));
    const clickY = Math.max(imgRect.top, Math.min(imgRect.bottom, e.clientY));

    const relX = clickX - contRect.left;
    const relY = clickY - contRect.top;

    setIsDrawing(true);
    setStartPoint({ x: relX, y: relY });
    setCrop({ x: relX, y: relY, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint || !containerRef.current || !imageRef.current) return;

    const contRect = containerRef.current.getBoundingClientRect();
    const imgRect = imageRef.current.getBoundingClientRect();

    const currX = Math.max(imgRect.left, Math.min(imgRect.right, e.clientX)) - contRect.left;
    const currY = Math.max(imgRect.top, Math.min(imgRect.bottom, e.clientY)) - contRect.top;

    const x = Math.min(startPoint.x, currX);
    const y = Math.min(startPoint.y, currY);
    const width = Math.abs(currX - startPoint.x);
    const height = Math.abs(currY - startPoint.y);

    setCrop({ x, y, width, height });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    // Ignore tiny accidental clicks (less than 15px)
    if (crop && (crop.width < 15 || crop.height < 15)) {
      setCrop(null);
    }
  };

  const handleResetCrop = () => {
    setCrop(null);
  };

  const handleCropAll = () => {
    if (!rawImageData) return;
    onConfirmCrop(rawImageData.dataUrl, rawImageData.width, rawImageData.height);
    onOpenChange(false);
  };

  const handleApplyCrop = () => {
    if (!rawImageData) return;

    // If no crop selection, use full image
    if (!crop || crop.width < 15 || crop.height < 15) {
      handleCropAll();
      return;
    }

    const { offsetX, offsetY, scaleX, scaleY } = displayScale;

    // Calculate crop coordinates relative to original image size
    const cropRelX = Math.max(0, crop.x - offsetX);
    const cropRelY = Math.max(0, crop.y - offsetY);

    const sourceX = Math.round(cropRelX * scaleX);
    const sourceY = Math.round(cropRelY * scaleY);
    const sourceW = Math.round(crop.width * scaleX);
    const sourceH = Math.round(crop.height * scaleY);

    if (sourceW <= 0 || sourceH <= 0) {
      handleCropAll();
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = sourceW;
      canvas.height = sourceH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        handleCropAll();
        return;
      }

      ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
      const croppedDataUrl = canvas.toDataURL('image/png', 0.95);
      onConfirmCrop(croppedDataUrl, sourceW, sourceH);
      onOpenChange(false);
    };
    img.src = rawImageData.dataUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] bg-slate-950/95 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl max-h-[94vh] flex flex-col backdrop-blur-md">
        <DialogHeader className="px-5 py-3.5 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Scissors size={16} />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                Recortar Captura de Tela
              </DialogTitle>
              <p className="text-[11px] text-zinc-400">
                Clique e arraste com o mouse para selecionar a área desejada da tela.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {crop && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleResetCrop}
                className="h-8 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Limpar Seleção</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Cropping Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative p-4 flex items-center justify-center bg-black/60 select-none cursor-crosshair min-h-[380px] max-h-[70vh]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {rawImageData && (
            <img
              ref={imageRef}
              src={rawImageData.dataUrl}
              alt="Raw Screen Capture"
              className="max-w-full max-h-[66vh] object-contain rounded border border-zinc-800/80 pointer-events-none"
              onLoad={updateMetrics}
            />
          )}

          {/* Dark Overlay when crop area is active */}
          {crop && crop.width > 5 && crop.height > 5 && (
            <>
              {/* Dimmed backdrop around selection */}
              <div
                className="absolute border-2 border-sky-400 bg-sky-400/10 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
                style={{
                  left: `${crop.x}px`,
                  top: `${crop.y}px`,
                  width: `${crop.width}px`,
                  height: `${crop.height}px`,
                }}
              >
                {/* Crop dimensions badge */}
                <div className="absolute -top-6 left-0 px-1.5 py-0.5 rounded bg-sky-600 text-white text-[10px] font-mono font-bold tracking-tight pointer-events-none shadow-md">
                  {Math.round(crop.width * displayScale.scaleX)} × {Math.round(crop.height * displayScale.scaleY)} px
                </div>

                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-sky-600" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-sky-600" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-sky-600" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-sky-600" />
              </div>
            </>
          )}

          {!crop && (
            <div className="absolute bottom-6 px-3 py-1.5 rounded-full bg-zinc-900/90 text-zinc-300 text-xs font-medium border border-zinc-700/60 shadow-lg pointer-events-none flex items-center gap-1.5 backdrop-blur-xs">
              <Crop size={14} className="text-sky-400" />
              <span>Arraste o mouse sobre a imagem para recortar apenas a parte que você quer</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/80 flex sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-zinc-400 hidden sm:block">
            {crop && crop.width > 15 && crop.height > 15
              ? 'Área personalizada selecionada'
              : 'Nenhuma área recortada (usará tela inteira se confirmar)'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCropAll}
              className="text-xs border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            >
              Usar Tela Inteira
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleApplyCrop}
              className="text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white gap-1.5 shadow-md"
            >
              <Check size={14} />
              <span>{crop && crop.width > 15 ? 'Aplicar Recorte' : 'Adicionar à Nota'}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
