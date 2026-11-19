import React, { useState, useEffect } from 'react';
import { Palette, Moon, Sun, RotateCcw, Sliders, Check } from 'lucide-react';

interface PaletteBarProps {
  projectColor: string;
  activeColor: string;
  onColorChange: (c: string) => void;
  framework: string;
  isDark: boolean;
  onToggleDark: () => void;
}

const PRESETS = [
  { name: 'Tailwind Blue', hex: '#3B82F6' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Coral', hex: '#FF6B6B' },
];

// Helper: HSL to Hex
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// Helper: Hex to Hue (0 - 360)
function hexToHue(hex: string): number {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return 215;
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max === min) h = 0;
  else if (max === r) h = (60 * ((g - b) / (max - min)) + 360) % 360;
  else if (max === g) h = (60 * ((b - r) / (max - min)) + 120) % 360;
  else if (max === b) h = (60 * ((r - g) / (max - min)) + 240) % 360;
  return Math.round(h);
}

export const PaletteBar: React.FC<PaletteBarProps> = ({
  projectColor,
  activeColor,
  onColorChange,
  framework,
  isDark,
  onToggleDark,
}) => {
  const [hue, setHue] = useState<number>(() => hexToHue(activeColor));
  const isUsingProjectColor =
    projectColor.toLowerCase() === activeColor.toLowerCase();

  // Sync hue slider when activeColor changes externally
  useEffect(() => {
    setHue(hexToHue(activeColor));
  }, [activeColor]);

  const handleHueSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseInt(e.target.value, 10);
    setHue(newHue);
    const newHex = hslToHex(newHue, 85, 55);
    onColorChange(newHex);
  };

  return (
    <div className="border-b border-vscode-border bg-vscode-sidebarBg/30 text-xs">
      {/* Top Row: Palette Projet & Statuts */}
      <div className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-vscode-border/50 bg-vscode-sidebarBg/40">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-vscode-fg/60 uppercase tracking-wider flex items-center gap-1">
            <Palette className="w-3 h-3 text-indigo-400" />
            Palette Projet
          </span>

          <button
            onClick={() => onColorChange(projectColor)}
            title={`Couleur détectée dans le projet : ${projectColor.toUpperCase()}`}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all ${
              isUsingProjectColor
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-semibold shadow-sm'
                : 'bg-vscode-inputBg border-vscode-border hover:border-vscode-fg/30 text-vscode-fg/80'
            }`}
          >
            <span
              className="w-3 h-3 rounded-full shadow-inner border border-white/20"
              style={{ backgroundColor: projectColor }}
            />
            <span className="font-mono text-[11px]">{projectColor.toUpperCase()}</span>
            {isUsingProjectColor && <Check className="w-3 h-3 text-emerald-400" />}
          </button>

          {!isUsingProjectColor && (
            <button
              onClick={() => onColorChange(projectColor)}
              title="Réinitialiser sur la couleur du projet"
              className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Rétablir projet</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-semibold text-vscode-fg/60 bg-vscode-inputBg px-1.5 py-0.5 rounded border border-vscode-border">
            {framework}
          </span>
          <button
            onClick={onToggleDark}
            title={isDark ? 'Mode Sombre actif' : 'Mode Clair actif'}
            className="p-1 text-vscode-fg/70 hover:text-vscode-fg hover:bg-vscode-inputBg rounded transition-colors"
          >
            {isDark ? (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom Row: Nuancier Personnalisé via Curseur & Pipette */}
      <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-vscode-fg/60 uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3 h-3 text-emerald-400" />
            Curseur Teinte
          </span>

          {/* Rainbow Hue Slider */}
          <div className="relative flex items-center" title="Glisser pour changer la teinte en direct">
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={handleHueSliderChange}
              style={{
                background:
                  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
              }}
              className="w-28 sm:w-40 h-2 rounded-lg appearance-none cursor-pointer border border-white/20 shadow-inner"
            />
          </div>

          {/* Color Swatch & Native Color Picker */}
          <label
            title="Sélecteur de couleur précis ou pipette"
            className="relative flex items-center gap-1.5 cursor-pointer bg-vscode-inputBg px-2 py-0.5 rounded border border-vscode-border hover:border-indigo-500 transition-all shadow-sm"
          >
            <span
              className="w-3.5 h-3.5 rounded-full shadow-inner border border-white/30"
              style={{ backgroundColor: activeColor }}
            />
            <span className="font-mono font-bold text-[11px] text-vscode-fg">
              {activeColor.toUpperCase()}
            </span>
            <input
              type="color"
              value={activeColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>

        {/* Quick Designer Presets */}
        <div className="flex items-center gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.hex}
              onClick={() => onColorChange(p.hex)}
              title={`${p.name} (${p.hex})`}
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                activeColor.toLowerCase() === p.hex.toLowerCase()
                  ? 'scale-125 ring-2 ring-indigo-500 shadow-sm'
                  : 'hover:scale-110 opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: p.hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
