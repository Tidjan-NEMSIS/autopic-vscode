import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PaletteBar } from './components/PaletteBar';
import { ProviderTabs } from './components/ProviderTabs';
import { IllustrationCard } from './components/IllustrationCard';
import { IllustrationCandidate, ProjectContext } from '../../src/types/messages';
import { vscode } from './hooks/useVSCodeApi';
import { Sparkles, Compass } from 'lucide-react';

declare global {
  interface Window {
    __AUTOPIC_VIEW_MODE__?: 'sidebar' | 'studio';
  }
}

// Fallback initial cards to ensure instant rich display
const INITIAL_CARDS: IllustrationCandidate[] = [
  {
    id: 'undraw:empty-wallet_j0kn',
    slug: 'empty-wallet_j0kn',
    title: 'Empty Wallet',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 95,
    license: 'unDraw Open License',
  },
  {
    id: 'undraw:page-not-found_6wni',
    slug: 'page-not-found_6wni',
    title: 'Page Not Found (404)',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 98,
    license: 'unDraw Open License',
  },
  {
    id: 'openpeeps:sitting-confused-404',
    slug: 'openpeeps-sitting-confused-404',
    title: 'Character Confused',
    provider: 'openpeeps',
    providerName: 'Open Peeps',
    score: 82,
    license: 'CC0 1.0 (Public Domain)',
  },
  {
    id: 'iradesign:financial-loss',
    slug: 'financial-loss',
    title: 'Financial Loss',
    provider: 'iradesign',
    providerName: 'IRA Design',
    score: 75,
    license: 'MIT License',
  },
];

export default function App() {
  const isSidebar = window.__AUTOPIC_VIEW_MODE__ !== 'studio';

  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [framework, setFramework] = useState('react');
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<IllustrationCandidate[]>(INITIAL_CARDS);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg) return;

      switch (msg.type) {
        case 'projectContext': {
          const ctx: ProjectContext = msg.context;
          if (ctx.palette) setColor(ctx.palette);
          if (ctx.framework) setFramework(ctx.framework);
          setIsDark(ctx.isDark);
          break;
        }

        case 'searchResults': {
          setLoading(msg.loading);
          if (!msg.loading && Array.isArray(msg.results)) {
            setCandidates(msg.results.length > 0 ? msg.results : INITIAL_CARDS);
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Tell host webview is ready
    vscode.postMessage({ command: 'ready' });

    // Initial search
    vscode.postMessage({
      command: 'search',
      query: 'empty',
      provider: '',
      color,
    });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const triggerSearch = (q: string, p = provider, c = color) => {
    setLoading(true);
    vscode.postMessage({
      command: 'search',
      query: q || 'empty',
      provider: p,
      color: c,
    });
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    triggerSearch(query, newProvider, color);
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
  };

  return (
    <div className="w-full h-full min-h-screen flex flex-col bg-vscode-bg text-vscode-fg selection:bg-indigo-500/30">
      <Header
        query={query}
        onQueryChange={setQuery}
        onSearch={(q) => triggerSearch(q, provider, color)}
        loading={loading}
        isSidebar={isSidebar}
      />

      <PaletteBar
        color={color}
        onColorChange={handleColorChange}
        framework={framework}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
      />

      <ProviderTabs
        selected={provider}
        onSelect={handleProviderChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-3 overflow-y-auto">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-vscode-fg/40">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs font-mono">Recherche multi-fournisseurs...</p>
          </div>
        ) : candidates.length > 0 ? (
          <div
            className={`grid gap-3 ${
              isSidebar
                ? 'grid-cols-1'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {candidates.map((cand) => (
              <IllustrationCard
                key={cand.id || cand.slug}
                candidate={cand}
                color={color}
                isDark={isDark}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-vscode-fg/40 text-center px-4">
            <Compass className="w-10 h-10 stroke-[1.5] text-vscode-fg/20" />
            <p className="text-xs font-medium">Aucune illustration trouvée pour "{query}".</p>
            <p className="text-[11px] text-vscode-fg/30">
              Essayez des termes comme "empty", "login", "404", "wallet", "team".
            </p>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="px-3 py-1.5 border-t border-vscode-border bg-vscode-sidebarBg/40 text-[10px] text-vscode-fg/40 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Autopic Studio v0.1.1</span>
        </span>
        <span>{candidates.length} illustrations prêtes</span>
      </footer>
    </div>
  );
}
