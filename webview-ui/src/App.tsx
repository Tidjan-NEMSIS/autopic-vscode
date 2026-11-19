import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PaletteBar } from './components/PaletteBar';
import { ProviderTabs } from './components/ProviderTabs';
import { GridControls, ColumnMode } from './components/GridControls';
import { IllustrationCard } from './components/IllustrationCard';
import { ZoomModal } from './components/ZoomModal';
import { IllustrationCandidate, ProjectContext } from '../../src/types/messages';
import { vscode } from './hooks/useVSCodeApi';
import { Sparkles, Compass } from 'lucide-react';

declare global {
  interface Window {
    __AUTOPIC_VIEW_MODE__?: 'sidebar' | 'studio';
  }
}

// 18 verified initial cards across unDraw, Open Peeps, and IRA Design
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
    id: 'undraw:empty-mailbox_ef0e',
    slug: 'empty-mailbox_ef0e',
    title: 'Empty Mailbox',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 92,
    license: 'unDraw Open License',
  },
  {
    id: 'undraw:empty-cart_574u',
    slug: 'empty-cart_574u',
    title: 'Empty Cart',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 90,
    license: 'unDraw Open License',
  },
  {
    id: 'openpeeps:sitting-confused-404',
    slug: 'openpeeps-sitting-confused-404',
    title: 'Character Confused',
    provider: 'openpeeps',
    providerName: 'Open Peeps',
    score: 88,
    license: 'CC0 1.0 (Public Domain)',
  },
  {
    id: 'iradesign:financial-loss',
    slug: 'financial-loss',
    title: 'Financial Loss',
    provider: 'iradesign',
    providerName: 'IRA Design',
    score: 85,
    license: 'MIT License',
  },
  {
    id: 'undraw:dashboard_86u3',
    slug: 'dashboard_86u3',
    title: 'Modern Dashboard',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 94,
    license: 'unDraw Open License',
  },
  {
    id: 'undraw:social-dashboard_81sv',
    slug: 'social-dashboard_81sv',
    title: 'Social Dashboard',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 91,
    license: 'unDraw Open License',
  },
  {
    id: 'iradesign:ira-analytics-dashboard',
    slug: 'ira-analytics-dashboard',
    title: 'Analytics Charts',
    provider: 'iradesign',
    providerName: 'IRA Design',
    score: 87,
    license: 'MIT License',
  },
  {
    id: 'undraw:wallet_diag',
    slug: 'wallet_diag',
    title: 'Digital Wallet',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 93,
    license: 'unDraw Open License',
  },
  {
    id: 'undraw:adding-funds_gpjb',
    slug: 'adding-funds_gpjb',
    title: 'Adding Funds',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 86,
    license: 'unDraw Open License',
  },
  {
    id: 'undraw:biometric-login_v832',
    slug: 'biometric-login_v832',
    title: 'Biometric Login',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 89,
    license: 'unDraw Open License',
  },
  {
    id: 'undraw:secure-login_m11a',
    slug: 'secure-login_m11a',
    title: 'Secure Authentication',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 92,
    license: 'unDraw Open License',
  },
  {
    id: 'openpeeps:security-auth-door',
    slug: 'openpeeps-security-auth-door',
    title: 'Character Auth Door',
    provider: 'openpeeps',
    providerName: 'Open Peeps',
    score: 84,
    license: 'CC0 1.0 (Public Domain)',
  },
  {
    id: 'undraw:financial-data_lbci',
    slug: 'financial-data_lbci',
    title: 'Financial Data',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 90,
    license: 'unDraw Open License',
  },
  {
    id: 'undraw:online-stats_d57c',
    slug: 'online-stats_d57c',
    title: 'Online Stats',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 88,
    license: 'unDraw Open License',
  },
  {
    id: 'undraw:web-app_141a',
    slug: 'web-app_141a',
    title: 'Responsive Web App',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 93,
    license: 'unDraw Open License',
  },
  {
    id: 'undraw:empty_4zx0',
    slug: 'empty_4zx0',
    title: 'Empty Box',
    provider: 'undraw',
    providerName: 'unDraw',
    score: 85,
    license: 'unDraw Open License',
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

  // Column mode: 'auto' or 1 to 6 columns
  const [columns, setColumns] = useState<ColumnMode>('auto');

  // Zoom modal inspection state
  const [zoomedCandidate, setZoomedCandidate] = useState<IllustrationCandidate | null>(null);

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

  // Determine grid style
  const gridStyle: React.CSSProperties =
    columns === 'auto'
      ? {}
      : {
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        };

  const gridClassName =
    columns === 'auto'
      ? 'grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
      : 'grid gap-2.5 sm:gap-3';

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

      <ProviderTabs selected={provider} onSelect={handleProviderChange} />

      <GridControls
        columns={columns}
        onColumnsChange={setColumns}
        totalCount={candidates.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-2.5 sm:p-3 overflow-y-auto">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-vscode-fg/40">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs font-mono">Recherche multi-fournisseurs...</p>
          </div>
        ) : candidates.length > 0 ? (
          <div className={gridClassName} style={gridStyle}>
            {candidates.map((cand) => (
              <IllustrationCard
                key={cand.id || cand.slug}
                candidate={cand}
                color={color}
                isDark={isDark}
                onOpenZoom={(c) => setZoomedCandidate(c)}
                isCompact={columns === 5 || columns === 6}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-vscode-fg/40 text-center px-4">
            <Compass className="w-10 h-10 stroke-[1.5] text-vscode-fg/20" />
            <p className="text-xs font-medium">Aucune illustration trouvée pour "{query}".</p>
            <p className="text-[11px] text-vscode-fg/30">
              Essayez des termes comme "empty", "login", "404", "wallet", "team", "dashboard".
            </p>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="px-3 py-1.5 border-t border-vscode-border bg-vscode-sidebarBg/40 text-[10px] text-vscode-fg/40 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Autopic Studio v0.1.2</span>
        </span>
        <span className="flex items-center gap-2 font-mono">
          <span>{candidates.length} illustrations</span>
          <span>•</span>
          <span className="text-indigo-400 font-semibold">
            {columns === 'auto' ? 'Auto (≤6)' : `${columns} colonnes`}
          </span>
        </span>
      </footer>

      {/* Zoom / Lightbox Modal */}
      {zoomedCandidate && (
        <ZoomModal
          candidate={zoomedCandidate}
          onClose={() => setZoomedCandidate(null)}
          color={color}
          onColorChange={handleColorChange}
          isDark={isDark}
          framework={framework}
        />
      )}
    </div>
  );
}
