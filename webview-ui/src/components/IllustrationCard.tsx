import React, { useState, useEffect } from 'react';
import { Plus, Download, Copy, Check, ZoomIn } from 'lucide-react';
import { IllustrationCandidate } from '../../src/types/messages';
import { vscode } from '../hooks/useVSCodeApi';

interface IllustrationCardProps {
  candidate: IllustrationCandidate;
  color: string;
  isDark: boolean;
  onOpenZoom: (candidate: IllustrationCandidate) => void;
  isCompact?: boolean;
}

export const IllustrationCard: React.FC<IllustrationCardProps> = ({
  candidate,
  color,
  isDark,
  onOpenZoom,
  isCompact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(candidate.svgContent || null);

  useEffect(() => {
    if (!svgContent) {
      vscode.postMessage({
        command: 'getSvg',
        slug: candidate.slug,
        provider: candidate.provider,
        color,
      });
    }
  }, [candidate.slug, candidate.provider, color]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (
        msg &&
        msg.type === 'svgContent' &&
        msg.slug === candidate.slug &&
        typeof msg.svg === 'string'
      ) {
        setSvgContent(msg.svg);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [candidate.slug]);

  const handleInsert = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInserting(true);
    vscode.postMessage({
      command: 'insertAtCursor',
      candidate,
      color,
    });
    setTimeout(() => setInserting(false), 1200);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCopied(true);
    vscode.postMessage({
      command: 'copySvg',
      candidate,
      color,
    });
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    vscode.postMessage({
      command: 'downloadSvg',
      candidate,
      color,
    });
  };

  // Safe string license extraction
  const licenseText: string =
    typeof candidate.license === 'string'
      ? candidate.license
      : (candidate.license as any)?.name || 'Approved Free';

  // Replace default purple with active color
  const renderedSvg = svgContent ? svgContent.replace(/#6c63ff/gi, color) : null;

  return (
    <div className="group flex flex-col bg-vscode-inputBg/40 hover:bg-vscode-inputBg/80 border border-vscode-border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-indigo-500/60">
      {/* SVG Preview Container (Click to Zoom) */}
      <div
        onClick={() => onOpenZoom(candidate)}
        title="Cliquer pour agrandir et zoomer"
        className={`relative w-full aspect-[4/3] flex items-center justify-center p-2.5 sm:p-3 cursor-pointer transition-colors ${
          isDark ? 'bg-slate-900/60' : 'bg-slate-100/70'
        }`}
      >
        {renderedSvg ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:object-contain pointer-events-none transition-transform duration-200 group-hover:scale-105"
            dangerouslySetInnerHTML={{ __html: renderedSvg }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-vscode-fg/30 animate-pulse pointer-events-none">
            <div className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="text-[9px] font-mono">Chargement...</span>
          </div>
        )}

        {/* Hover zoom center pill badge */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25 pointer-events-none">
          <span className="px-2 py-1 bg-black/75 text-white rounded-full text-[10px] font-medium backdrop-blur-sm flex items-center gap-1 shadow-lg border border-white/10 scale-95 group-hover:scale-100 transition-transform">
            <ZoomIn className="w-3 h-3 text-indigo-400" />
            <span>Zoomer</span>
          </span>
        </div>

        {/* Quick Actions overlay on hover (top right) */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenZoom(candidate);
            }}
            title="Agrandir et zoomer (Vue détaillée)"
            className="p-1 bg-vscode-sidebarBg/90 hover:bg-vscode-sidebarBg text-vscode-fg border border-vscode-border rounded shadow-sm transition-transform active:scale-90"
          >
            <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
          </button>
          <button
            onClick={handleCopy}
            title="Copier le code SVG"
            className="p-1 bg-vscode-sidebarBg/90 hover:bg-vscode-sidebarBg text-vscode-fg border border-vscode-border rounded shadow-sm transition-transform active:scale-90"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            title="Télécharger le fichier .svg"
            className="p-1 bg-vscode-sidebarBg/90 hover:bg-vscode-sidebarBg text-vscode-fg border border-vscode-border rounded shadow-sm transition-transform active:scale-90"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Score badge (bottom left) */}
        <div className="absolute bottom-1.5 left-1.5 z-10 pointer-events-none">
          <span className="text-[9px] font-mono font-bold bg-vscode-sidebarBg/90 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded shadow-sm">
            {candidate.score}%
          </span>
        </div>
      </div>

      {/* Info & CTA */}
      <div className="p-2 sm:p-2.5 flex flex-col gap-1.5 flex-1 justify-between">
        <div>
          <h4
            className="text-[11px] sm:text-xs font-semibold text-vscode-fg truncate"
            title={candidate.title}
          >
            {candidate.title}
          </h4>
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-vscode-fg/50 mt-0.5">
            <span className="font-medium text-indigo-400 truncate max-w-[70px]">
              {candidate.providerName || candidate.provider}
            </span>
            <span className="truncate max-w-[80px]" title={licenseText}>
              {licenseText}
            </span>
          </div>
        </div>

        <button
          onClick={handleInsert}
          disabled={inserting}
          className="w-full flex items-center justify-center gap-1 py-1 sm:py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-medium shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {inserting ? (
            <>
              <Check className="w-3 h-3 animate-bounce" />
              <span>Inséré !</span>
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              <span className="truncate">Insérer</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
