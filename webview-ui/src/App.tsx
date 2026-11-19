import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { PaletteBar } from './components/PaletteBar';
import { ProviderTabs } from './components/ProviderTabs';
import { GridControls, ColumnMode } from './components/GridControls';
import { IllustrationCard } from './components/IllustrationCard';
import { ZoomModal } from './components/ZoomModal';
import { IllustrationCandidate, ProjectContext } from '../../src/types/messages';
import { vscode } from './hooks/useVSCodeApi';
import { Sparkles, Compass, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    __AUTOPIC_VIEW_MODE__?: 'sidebar' | 'studio';
  }
}

// Initial fallback cards
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
  // Palette du Projet (détectée) vs Active Color (choix utilisateur)
  const [projectColor, setProjectColor] = useState('#3B82F6');
  const [color, setColor] = useState('#3B82F6');
  const [framework, setFramework] = useState('react');
  const [isDark, setIsDark] = useState(true);

  // Pagination & Infinite Scrolling state
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [candidates, setCandidates] = useState<IllustrationCandidate[]>(INITIAL_CARDS);

  // Column mode: 'auto' or 1 to 6 columns
  const [columns, setColumns] = useState<ColumnMode>('auto');

  // Zoom modal inspection state
  const [zoomedCandidate, setZoomedCandidate] = useState<IllustrationCandidate | null>(null);

  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg) return;

      switch (msg.type) {
        case 'projectContext': {
          const ctx: ProjectContext = msg.context;
          if (ctx.palette) {
            setProjectColor(ctx.palette);
            // Default active color to project color if not customized yet
            setColor((prev) => (prev === '#3B82F6' ? ctx.palette : prev));
          }
          if (ctx.framework) setFramework(ctx.framework);
          setIsDark(ctx.isDark);
          break;
        }

        case 'searchResults': {
          setLoading(false);
          setLoadingMore(false);
          if (typeof msg.hasMore === 'boolean') setHasMore(msg.hasMore);
          if (typeof msg.page === 'number') setPage(msg.page);

          if (Array.isArray(msg.results)) {
            if (msg.append) {
              setCandidates((prev) => {
                const existing = new Set(prev.map((c) => c.slug || c.id));
                const fresh = msg.results.filter(
                  (c: IllustrationCandidate) => !existing.has(c.slug || c.id)
                );
                return [...prev, ...fresh];
              });
            } else {
              setCandidates(msg.results.length > 0 ? msg.results : INITIAL_CARDS);
            }
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Tell host webview is ready
    vscode.postMessage({ command: 'ready' });

    // Initial search: load first page of illustrations
    vscode.postMessage({
      command: 'search',
      query: '',
      provider: '',
      color,
      page: 1,
      append: false,
    });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const triggerSearch = (q: string, p = provider, c = color) => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    vscode.postMessage({
      command: 'search',
      query: q,
      provider: p,
      color: c,
      page: 1,
      append: false,
    });
  };

  const loadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    vscode.postMessage({
      command: 'search',
      query,
      provider,
      color,
      page: nextPage,
      append: true,
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 400) {
      loadMore();
    }
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
        projectColor={projectColor}
        activeColor={color}
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

      {/* Main Content Area with Infinite Scrolling */}
      <main
        ref={mainRef}
        onScroll={handleScroll}
        className="flex-1 p-2.5 sm:p-3 overflow-y-auto"
      >
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-vscode-fg/40">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs font-mono">Recherche multi-fournisseurs...</p>
          </div>
        ) : candidates.length > 0 ? (
          <>
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

            {/* Bottom Infinite Scroll Loader */}
            {loadingMore && (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-vscode-fg/50">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-[11px] font-mono">
                  Chargement d'illustrations supplémentaires...
                </span>
              </div>
            )}

            {/* End of illustrations notification */}
            {!hasMore && candidates.length > 10 && (
              <div className="py-8 text-center text-[11px] text-vscode-fg/40 font-mono flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Toutes les illustrations disponibles ont été chargées ({candidates.length} au total).
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center gap-2 text-vscode-fg/40 text-center px-4">
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
          <span>Autopic Studio v0.1.3</span>
        </span>
        <span className="flex items-center gap-2 font-mono">
          <span>{candidates.length} illustrations</span>
          <span>•</span>
          <span className="text-indigo-400 font-semibold">
            {columns === 'auto' ? 'Auto (≤6)' : `${columns} colonnes`}
          </span>
          {hasMore && (
            <>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Défilement infini actif</span>
            </>
          )}
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
