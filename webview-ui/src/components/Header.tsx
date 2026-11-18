import React, { useState } from 'react';
import { Search, Maximize2, RotateCw, X } from 'lucide-react';
import { vscode } from '../hooks/useVSCodeApi';

interface HeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (q: string) => void;
  loading: boolean;
  isSidebar: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  query,
  onQueryChange,
  onSearch,
  loading,
  isSidebar,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="p-3 border-b border-vscode-border bg-vscode-sidebarBg/50 backdrop-blur-sm sticky top-0 z-20 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
            A
          </div>
          <span className="font-bold tracking-tight text-vscode-fg text-sm flex items-center gap-1.5">
            Autopic Studio
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              v0.1
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => vscode.postMessage({ command: 'refreshProject' })}
            title="Rafraîchir le contexte du projet"
            className="p-1.5 text-vscode-fg/70 hover:text-vscode-fg hover:bg-vscode-inputBg rounded transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          {isSidebar && (
            <button
              onClick={() => vscode.postMessage({ command: 'openStudio' })}
              title="Ouvrir le Studio en grand écran"
              className="p-1.5 text-vscode-fg/70 hover:text-vscode-fg hover:bg-vscode-inputBg rounded transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative flex items-center">
        <Search className="w-4 h-4 text-vscode-fg/40 absolute left-2.5 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Rechercher (ex: empty wallet, 404, team...)"
          className="w-full bg-vscode-inputBg text-vscode-inputFg border border-vscode-inputBorder rounded-md pl-8 pr-8 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-vscode-fg/40"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onQueryChange('');
              onSearch('');
            }}
            className="absolute right-2.5 text-vscode-fg/40 hover:text-vscode-fg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>
    </div>
  );
};
