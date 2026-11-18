import React from 'react';
import { Palette, Moon, Sun } from 'lucide-react';

interface PaletteBarProps {
  color: string;
  onColorChange: (c: string) => void;
  framework: string;
  isDark: boolean;
  onToggleDark: () => void;
}

const PRESETS = [
  { name: 'Tailwind Blue', hex: '#3B82F6' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Amber', hex: '#F59E0B' },
];

export const PaletteBar: React.FC<PaletteBarProps> = ({
  color,
  onColorChange,
  framework,
  isDark,
  onToggleDark,
}) => {
  return (
    <div className="px-3 py-2 bg-vscode-sidebarBg/30 border-b border-vscode-border flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2">
        <label
          title="Changer la couleur de teinte"
          className="relative flex items-center gap-1.5 cursor-pointer bg-vscode-inputBg px-2 py-1 rounded border border-vscode-border hover:border-vscode-fg/30 transition-all"
        >
          <span
            className="w-3.5 h-3.5 rounded-full shadow-inner border border-white/20"
            style={{ backgroundColor: color }}
          />
          <span className="font-mono font-medium text-[11px] text-vscode-fg">
            {color.toUpperCase()}
          </span>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
        </label>

        <div className="flex items-center gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.hex}
              onClick={() => onColorChange(p.hex)}
              title={p.name}
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                color.toLowerCase() === p.hex.toLowerCase()
                  ? 'scale-125 ring-2 ring-indigo-500'
                  : 'hover:scale-110 opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: p.hex }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase font-semibold text-vscode-fg/60 bg-vscode-inputBg px-1.5 py-0.5 rounded border border-vscode-border">
          {framework}
        </span>
        <button
          onClick={onToggleDark}
          title={isDark ? 'Mode Sombre actif' : 'Mode Clair actif'}
          className="p-1 text-vscode-fg/70 hover:text-vscode-fg hover:bg-vscode-inputBg rounded transition-colors"
        >
          {isDark ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
        </button>
      </div>
    </div>
  );
};
