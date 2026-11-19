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
          <div className="w-5 h-5 flex items-center justify-center text-indigo-400 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#38bdf8" d="M 6,8 C 4.9,8 4,8.9 4,10 L 4,12 C 4.6,12 5.5,12.4 5.9,13 C 6.7,14 6.7,15 5.9,16 C 5.5,16.6 4.6,17 4,17 L 4,19 C 4,20.1 4.9,21 6,21 L 13,21 C 14.1,21 15,20.1 15,19 L 15,17 C 15.6,17 16.5,17.4 17.1,16.8 C 18.2,15.7 18.2,14.3 17.1,13.2 C 16.5,12.6 15.6,13 15,13 L 15,10 C 15,8.9 14.1,8 13,8 L 11.5,8 C 11.5,7.4 11.9,6.5 11.3,5.9 C 10.2,4.8 8.8,4.8 7.7,5.9 C 7.1,6.5 7.5,7.4 7.5,8 Z" />
              <path fill="#facc15" d="M 18,1.5 C 18,3.8 19.7,5.5 22,5.5 C 19.7,5.5 18,7.2 18,9.5 C 18,7.2 16.3,5.5 14,5.5 C 16.3,5.5 18,3.8 18,1.5 Z" />
              <path fill="#facc15" d="M 21.5,9.5 C 21.5,11 22.5,12 24,12 C 22.5,12 21.5,13 21.5,14.5 C 21.5,13 20.5,12 19,12 C 20.5,12 21.5,11 21.5,9.5 Z" />
            </svg>
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
