import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Plus, Copy, Download, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { IllustrationCandidate } from '../../src/types/messages';
import { vscode } from '../hooks/useVSCodeApi';
import { useSvg } from '../store/svgStore';
import { darkAdaptSvg, recolorSvg } from '../utils/svg';

interface ZoomModalProps {
  candidate: IllustrationCandidate | null;
  onClose: () => void;
  color: string;
  onColorChange: (c: string) => void;
  isDark: boolean;
  framework: string;
}

const COLOR_PRESETS = [
  '#3B82F6', // Tailwind Blue
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#A855F7', // Purple
  '#F43F5E', // Rose
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#FFFFFF', // White
];

export const ZoomModal: React.FC<ZoomModalProps> = ({
  candidate,
  onClose,
  color,
  onColorChange,
  isDark,
  framework,
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copied, setCopied] = useState<boolean>(false);
  const [inserted, setInserted] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rawSvg = useSvg(candidate?.slug || '', candidate?.provider || '', !!candidate);

  // Reset zoom & pan when candidate changes
  useEffect(() => {
    if (candidate) {
      setZoomScale(1);
      setPan({ x: 0, y: 0 });
    }
  }, [candidate?.slug, candidate?.provider]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!candidate) return null;

  // Zoom helpers
  const handleZoomIn = () => setZoomScale((z) => Math.min(3.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomScale((z) => Math.max(0.4, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomScale > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Actions
  const handleInsert = () => {
    setInserted(true);
    vscode.postMessage({
      command: 'insertAtCursor',
      candidate,
      color,
      framework,
    });
    setTimeout(() => setInserted(false), 1500);
  };

  const handleCopy = () => {
    setCopied(true);
    vscode.postMessage({
      command: 'copySvg',
      candidate,
      color,
    });
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    vscode.postMessage({
      command: 'downloadSvg',
      candidate,
      color,
    });
  };

  const renderedSvg = useMemo(() => {
    if (!rawSvg) return null;
    const recolored = recolorSvg(rawSvg, color);
    return isDark ? darkAdaptSvg(recolored) : recolored;
  }, [rawSvg, color, isDark]);

  const licenseText: string =
    typeof candidate.license === 'string'
      ? candidate.license
      : (candidate.license as any)?.name || 'Approved Free';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-vscode-sidebarBg border border-vscode-border rounded-xl shadow-2xl overflow-hidden text-vscode-fg">
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-vscode-border bg-vscode-sidebarBg/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <div className="truncate">
              <h3 className="text-sm font-bold truncate text-vscode-fg">
                {candidate.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-vscode-fg/60 mt-0.5">
                <span className="font-semibold text-indigo-400">
                  {candidate.providerName || candidate.provider}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {licenseText}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-mono font-bold">
                  Score: {candidate.score}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              title="Fermer (Échap)"
              className="p-1.5 text-vscode-fg/70 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Canvas / SVG Viewer */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative flex-1 min-h-[340px] sm:min-h-[460px] flex items-center justify-center overflow-hidden select-none transition-colors ${
            isDark ? 'bg-slate-950/80' : 'bg-slate-100/90'
          } ${zoomScale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        >
          {renderedSvg ? (
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomScale})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              className="w-full h-full max-w-[80%] max-h-[80%] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:object-contain pointer-events-none"
              dangerouslySetInnerHTML={{ __html: renderedSvg }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-vscode-fg/40 animate-pulse">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <span className="text-xs font-mono">Chargement du vecteur haute définition...</span>
            </div>
          )}

          {/* Floating Zoom Stepper Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-vscode-sidebarBg/90 backdrop-blur-md border border-vscode-border rounded-full shadow-lg z-20">
            <button
              onClick={handleZoomOut}
              disabled={zoomScale <= 0.4}
              title="Dézoomer (-)"
              className="p-1 text-vscode-fg hover:text-white hover:bg-vscode-inputBg rounded-full disabled:opacity-30 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleResetZoom}
              title="Réinitialiser le zoom (100%)"
              className="px-2 py-0.5 text-xs font-mono font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {Math.round(zoomScale * 100)}%
            </button>

            <button
              onClick={handleZoomIn}
              disabled={zoomScale >= 3.5}
              title="Zoomer (+)"
              className="p-1 text-vscode-fg hover:text-white hover:bg-vscode-inputBg rounded-full disabled:opacity-30 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="h-3 w-px bg-vscode-border mx-1" />

            <button
              onClick={handleResetZoom}
              title="Réinitialiser la vue"
              className="p-1 text-vscode-fg/70 hover:text-white hover:bg-vscode-inputBg rounded-full transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Bar: Palette Variations + Action Buttons */}
        <div className="px-4 py-3 border-t border-vscode-border bg-vscode-sidebarBg/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Live Color Tuning in Zoom */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-vscode-fg/60 font-medium">Teinte :</span>
            <div className="flex items-center gap-1.5">
              {COLOR_PRESETS.map((hex) => (
                <button
                  key={hex}
                  onClick={() => onColorChange(hex)}
                  title={hex}
                  className={`w-4 h-4 rounded-full transition-all ${
                    color.toLowerCase() === hex.toLowerCase()
                      ? 'scale-125 ring-2 ring-indigo-500 shadow-sm'
                      : 'hover:scale-110 opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
              <label
                title="Sélecteur personnalisé"
                className="relative flex items-center justify-center w-5 h-5 rounded cursor-pointer border border-vscode-border bg-vscode-inputBg"
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-vscode-inputBg hover:bg-vscode-border text-vscode-fg rounded-md text-xs font-medium border border-vscode-border transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier SVG</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-vscode-inputBg hover:bg-vscode-border text-vscode-fg rounded-md text-xs font-medium border border-vscode-border transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger</span>
            </button>

            <button
              onClick={handleInsert}
              disabled={inserted}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium shadow-md transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {inserted ? (
                <>
                  <Check className="w-3.5 h-3.5 animate-bounce" />
                  <span>Code injecté !</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insérer au curseur</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
