import React from 'react';
import { LayoutGrid, ZoomIn, ZoomOut, SlidersHorizontal } from 'lucide-react';

export type ColumnMode = 'auto' | 1 | 2 | 3 | 4 | 5 | 6;

interface GridControlsProps {
  columns: ColumnMode;
  onColumnsChange: (cols: ColumnMode) => void;
  totalCount: number;
}

export const GridControls: React.FC<GridControlsProps> = ({
  columns,
  onColumnsChange,
  totalCount,
}) => {
  const currentNum = columns === 'auto' ? 6 : columns;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) as ColumnMode;
    onColumnsChange(val);
  };

  return (
    <div className="px-3 py-1.5 bg-vscode-sidebarBg/20 border-b border-vscode-border flex flex-wrap items-center justify-between gap-2 text-xs">
      {/* Left: Count and quick preset buttons */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-vscode-fg/60 font-medium">
          {totalCount} illustrations
        </span>

        <div className="h-3 w-px bg-vscode-border" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => onColumnsChange('auto')}
            title="Colonnes automatiques adaptatives"
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
              columns === 'auto'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-vscode-fg/70 hover:text-vscode-fg hover:bg-vscode-inputBg'
            }`}
          >
            Auto
          </button>

          {[2, 3, 4, 6].map((col) => (
            <button
              key={col}
              onClick={() => onColumnsChange(col as ColumnMode)}
              title={`Afficher ${col} colonnes par ligne`}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
                columns === col
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-vscode-fg/70 hover:text-vscode-fg hover:bg-vscode-inputBg'
              }`}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Interactive Zoom Slider */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const next = Math.max(1, (columns === 'auto' ? 6 : columns) - 1) as ColumnMode;
            onColumnsChange(next);
          }}
          disabled={columns === 1}
          title="Zoomer (moins de colonnes, cartes plus grandes)"
          className="p-1 text-vscode-fg/60 hover:text-vscode-fg disabled:opacity-30 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1.5" title="Ajuster la vue (1 à 6 colonnes par ligne)">
          <input
            type="range"
            min="1"
            max="6"
            step="1"
            value={currentNum}
            onChange={handleSliderChange}
            className="w-20 sm:w-28 h-1.5 bg-vscode-inputBg rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="text-[10px] font-mono text-indigo-400 font-semibold min-w-[48px] text-right">
            {columns === 'auto' ? 'Auto (≤6)' : `${columns} / ligne`}
          </span>
        </div>

        <button
          onClick={() => {
            const next = Math.min(6, (columns === 'auto' ? 4 : columns) + 1) as ColumnMode;
            onColumnsChange(next);
          }}
          disabled={columns === 6}
          title="Dézoomer (plus de colonnes, vue globale jusqu'à 6)"
          className="p-1 text-vscode-fg/60 hover:text-vscode-fg disabled:opacity-30 transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
