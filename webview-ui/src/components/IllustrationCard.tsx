import React, { useState, useEffect } from 'react';
import { Plus, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { IllustrationCandidate } from '../../src/types/messages';
import { vscode } from '../hooks/useVSCodeApi';

interface IllustrationCardProps {
  candidate: IllustrationCandidate;
  color: string;
  isDark: boolean;
}

export const IllustrationCard: React.FC<IllustrationCardProps> = ({
  candidate,
  color,
  isDark,
}) => {
  const [copied, setCopied] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(candidate.svgContent || null);

  useEffect(() => {
    // Request SVG content if not available
    if (!svgContent) {
      vscode.postMessage({
        command: 'getSvg',
        slug: candidate.slug,
        provider: candidate.provider,
        color,
      });
    }
  }, [candidate.slug, candidate.provider, color]);

  // Listen for returned SVG content
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg && msg.type === 'svgContent' && msg.slug === candidate.slug) {
        setSvgContent(msg.svg);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [candidate.slug]);

  const handleInsert = async () => {
    setInserting(true);
    vscode.postMessage({
      command: 'insertAtCursor',
      candidate,
      color,
    });
    setTimeout(() => setInserting(false), 1200);
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

  // Replace default unDraw/standard purple with current palette dynamically
  const renderedSvg = svgContent
    ? svgContent.replace(/#6c63ff/gi, color)
    : null;

  return (
    <div className="group flex flex-col bg-vscode-inputBg/40 hover:bg-vscode-inputBg/80 border border-vscode-border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-indigo-500/50">
      {/* SVG Preview Container */}
      <div
        className={`relative w-full aspect-[4/3] flex items-center justify-center p-3 transition-colors ${
          isDark ? 'bg-slate-900/50' : 'bg-slate-100/60'
        }`}
      >
        {renderedSvg ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:object-contain"
            dangerouslySetInnerHTML={{ __html: renderedSvg }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-vscode-fg/30 animate-pulse">
            <div className="w-10 h-10 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="text-[10px] font-mono">Chargement SVG...</span>
          </div>
        )}

        {/* Floating Quick Action Buttons on hover */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

        {/* Score pill */}
        <div className="absolute bottom-2 left-2">
          <span className="text-[10px] font-mono font-bold bg-vscode-sidebarBg/90 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded shadow-sm">
            {candidate.score}%
          </span>
        </div>
      </div>

      {/* Info & Insertion CTA */}
      <div className="p-2.5 flex flex-col gap-2 flex-1 justify-between">
        <div>
          <h4
            className="text-xs font-semibold text-vscode-fg truncate"
            title={candidate.title}
          >
            {candidate.title}
          </h4>
          <div className="flex items-center justify-between text-[10px] text-vscode-fg/50 mt-0.5">
            <span className="font-medium text-indigo-400">
              {candidate.providerName}
            </span>
            <span className="truncate max-w-[110px]" title={candidate.license}>
              {candidate.license}
            </span>
          </div>
        </div>

        <button
          onClick={handleInsert}
          disabled={inserting}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {inserting ? (
            <>
              <Check className="w-3.5 h-3.5 animate-bounce" />
              <span>Inséré !</span>
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
  );
};
