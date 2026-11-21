import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IllustrationCandidate, ProjectContext } from '../types/messages';

let autopicEngine: any = null;

function getAutopic() {
  if (!autopicEngine) {
    try {
      autopicEngine = require('tidjan-autopic');
    } catch (e) {
      console.warn('Could not load tidjan-autopic, fallback will be used');
    }
  }
  return autopicEngine;
}

interface SearchPage {
  results: IllustrationCandidate[];
  hasMore: boolean;
  page: number;
  total?: number;
  fallback?: boolean;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function createTimeoutSignal(ms = 8000): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  if (typeof (timer as any).unref === 'function') (timer as any).unref();
  return controller.signal;
}

export class AutopicBridge {
  private static cachedBuildId: string | null = null;
  private static buildIdExpiresAt = 0;
  private static svgCache = new Map<string, CacheEntry<string>>();
  private static inflightSvg = new Map<string, Promise<string>>();
  private static searchCache = new Map<string, CacheEntry<SearchPage>>();
  private static readonly SVG_TTL = 3600000;
  private static readonly SEARCH_TTL = 300000;
  private static readonly BUILD_ID_TTL = 21600000;
  private static readonly MAX_CACHE_ENTRIES = 200;

  public static getProjectRoot(): string {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : process.cwd();
  }

  public static async scanProject(): Promise<ProjectContext> {
    const root = this.getProjectRoot();
    const autopic = getAutopic();

    let framework: ProjectContext['framework'] = 'react';
    let palette = '#3B82F6';
    let isDark = false;

    const inspection = autopic?.inspectProject
      ? autopic.inspectProject(root)
      : autopic?.SearchEngine?.inspectProject
        ? autopic.SearchEngine.inspectProject(root)
        : null;

    if (inspection) {
      const detected = inspection.framework === 'nextjs-pages' ? 'nextjs' : inspection.framework;
      if (['react', 'nextjs', 'vue', 'svelte', 'flutter', 'html'].includes(detected)) {
        framework = detected as ProjectContext['framework'];
      }
      if (inspection.primaryColor) palette = inspection.primaryColor;
    } else {
      const pkgPath = path.join(root, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps['next']) framework = 'nextjs';
          else if (deps['vue'] || deps['nuxt']) framework = 'vue';
          else if (deps['svelte']) framework = 'svelte';
          else if (deps['react']) framework = 'react';
        } catch {}
      } else if (fs.existsSync(path.join(root, 'pubspec.yaml'))) {
        framework = 'flutter';
      }

      palette = this.detectPalette(root) || palette;
    }

    const activeColorTheme = vscode.window.activeColorTheme;
    isDark =
      activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
      activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;

    return { framework, palette, isDark, projectRoot: root };
  }

  private static detectPalette(root: string): string | null {
    for (const twFile of [
      'tailwind.config.ts',
      'tailwind.config.js',
      'tailwind.config.mjs',
      'tailwind.config.cjs',
    ]) {
      const twPath = path.join(root, twFile);
      if (!fs.existsSync(twPath)) continue;
      const content = fs.readFileSync(twPath, 'utf8');
      const match =
        content.match(/primary['"]?\s*:\s*['"](#[0-9a-fA-F]{6})['"]/i) ||
        content.match(/brand['"]?\s*:\s*['"](#[0-9a-fA-F]{6})['"]/i) ||
        content.match(/['"]primary['"]?\s*:\s*\{[^}]*['"]DEFAULT['"]?\s*:\s*['"](#[0-9a-fA-F]{6})['"]/i);
      if (match) return match[1].toUpperCase();
    }

    for (const cssFile of [
      'app/globals.css',
      'src/app/globals.css',
      'styles/globals.css',
      'src/index.css',
    ]) {
      const cssPath = path.join(root, cssFile);
      if (!fs.existsSync(cssPath)) continue;
      const css = fs.readFileSync(cssPath, 'utf8');
      const match = css.match(/--(?:primary|brand|color-primary)\s*:\s*(#[0-9a-fA-F]{6})/i);
      if (match) return match[1].toUpperCase();
    }

    return null;
  }

  public static async getUndrawBuildId(): Promise<string> {
    if (this.cachedBuildId && this.buildIdExpiresAt > Date.now()) {
      return this.cachedBuildId;
    }

    try {
      const resp = await fetch('https://undraw.co/illustrations', {
        signal: createTimeoutSignal(8000),
      });
      if (resp.ok) {
        const text = await resp.text();
        const match = text.match(/"buildId":"([^"]+)"/);
        if (match && match[1]) {
          this.cachedBuildId = match[1];
          this.buildIdExpiresAt = Date.now() + this.BUILD_ID_TTL;
          return match[1];
        }
      }
    } catch {}

    return this.cachedBuildId || 'rgL-_q8RRpwRSWfQrSDDI';
  }

  public static async searchWithPagination(
    query: string,
    options: { provider?: string; color?: string; page?: number; limit?: number; forceRefresh?: boolean } = {}
  ): Promise<SearchPage> {
    const page = options.page !== undefined ? options.page : 1;
    const cacheKey = `${(query || '').trim().toLowerCase()}|${options.provider || ''}|${page}|${options.limit || ''}`;
    const cached = this.searchCache.get(cacheKey);

    if (!options.forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.searchWithPaginationUncached(query, options);
    this.searchCache.set(cacheKey, { value: result, expiresAt: Date.now() + this.SEARCH_TTL });
    this.trimCache(this.searchCache);
    return result;
  }

  private static async searchWithPaginationUncached(
    query: string,
    options: { provider?: string; color?: string; page?: number; limit?: number } = {}
  ): Promise<SearchPage> {
    const page = options.page !== undefined ? options.page : 1;
    const trimmed = (query || '').trim();

    // Mode 1: Empty or browse mode -> Complete collection via SSG pages (1800+ illustrations)
    if (!trimmed || trimmed.toLowerCase() === 'all' || trimmed.toLowerCase() === 'browse') {
      const extras: IllustrationCandidate[] = [];
      const autopic = getAutopic();

      // On first page, include curated OpenPeeps & IraDesign
      if (page <= 1) {
        if (autopic && (!options.provider || options.provider === 'openpeeps')) {
          try {
            const opProvider = new autopic.OpenPeepsProvider();
            const opList = await opProvider.search({ limit: 10 });
            extras.push(
              ...opList.map((r: any) => ({
                id: r.id || `openpeeps:${r.slug}`,
                slug: r.slug,
                title: r.title,
                provider: 'openpeeps' as const,
                providerName: 'Open Peeps',
                score: 92,
                license: 'CC0 1.0 (Public Domain)',
              }))
            );
          } catch {}
        }

        if (autopic && (!options.provider || options.provider === 'iradesign')) {
          try {
            const iraProvider = new autopic.IraDesignProvider();
            const iraList = await iraProvider.search({ limit: 10 });
            extras.push(
              ...iraList.map((r: any) => ({
                id: r.id || `iradesign:${r.slug}`,
                slug: r.slug,
                title: r.title,
                provider: 'iradesign' as const,
                providerName: 'IRA Design',
                score: 90,
                license: 'MIT License',
              }))
            );
          } catch {}
        }
      }

      if (options.provider === 'openpeeps' || options.provider === 'iradesign') {
        const filtered = extras.filter((x) => x.provider === options.provider);
        return {
          results: filtered,
          hasMore: false,
          page,
          total: filtered.length,
        };
      }

      const browsePage = Math.max(1, page);
      try {
        const buildId = await this.getUndrawBuildId();
        const dataUrl = `https://undraw.co/_next/data/${buildId}/illustrations${
          browsePage === 1 ? '' : '/' + browsePage
        }.json`;
        const resp = await fetch(dataUrl, { signal: createTimeoutSignal(8000) });
        if (resp.ok) {
          const json: any = await resp.json();
          const rawItems = json.pageProps?.illustrations || [];
          const totalPages = json.pageProps?.totalPages || 45;
          const undrawItems: IllustrationCandidate[] = rawItems.map((item: any) => ({
            id: `undraw:${item.newSlug || item.title.toLowerCase().replace(/\s+/g, '-')}`,
            slug: item.newSlug || item.title.toLowerCase().replace(/\s+/g, '-'),
            title: item.title,
            provider: 'undraw' as const,
            providerName: 'unDraw',
            score: 95,
            license: 'unDraw Open License',
          }));

          const combined = browsePage === 1 ? [...extras, ...undrawItems] : undrawItems;
          return {
            results: combined,
            hasMore: browsePage < totalPages,
            page: browsePage,
            total: totalPages * 40,
          };
        }
      } catch (err) {
        console.warn('Error fetching unDraw browse page:', err);
      }

      return {
        results: this.getMockResults(''),
        hasMore: false,
        page,
        fallback: true,
      };
    }

    // Mode 2: Keyword search with query (ex: "wallet", "empty", "login", "team")
    try {
      const searchPage = Math.max(0, page - 1);
      const url = `https://undraw.co/api/search?q=${encodeURIComponent(trimmed)}&page=${searchPage}`;
      const resp = await fetch(url, {
        signal: createTimeoutSignal(8000),
        headers: {
          'User-Agent': 'Mozilla/5.0 tidjan-autopic',
          'Accept': 'application/json',
          'Referer': 'https://undraw.co/illustrations',
        },
      });

      let undrawResults: IllustrationCandidate[] = [];
      let hasMore = false;
      let total = 0;

      if (resp.ok) {
        const data: any = await resp.json();
        const rawItems = Array.isArray(data.results) ? data.results : [];
        hasMore = !!data.hasMore;
        total = data.total || rawItems.length;

        undrawResults = rawItems.map((item: any) => ({
          id: `undraw:${item.newSlug || item.title.toLowerCase().replace(/\s+/g, '-')}`,
          slug: item.newSlug || item.title.toLowerCase().replace(/\s+/g, '-'),
          title: item.title,
          provider: 'undraw' as const,
          providerName: 'unDraw',
          score: 92,
          license: 'unDraw Open License',
        }));
      }

      let extras: IllustrationCandidate[] = [];
      if (searchPage === 0) {
        const autopic = getAutopic();
        if (autopic && typeof autopic.searchIllustrations === 'function') {
          try {
            const others = await autopic.searchIllustrations(trimmed, {
              providers: ['openpeeps', 'iradesign'],
              limit: 6,
            });
            extras = (others || []).map((r: any) => ({
              id: r.id || `${r.providerId}:${r.slug}`,
              slug: r.slug,
              title: r.title,
              provider: r.providerId || r.provider,
              providerName:
                r.providerName || (r.providerId === 'openpeeps' ? 'Open Peeps' : 'IRA Design'),
              score: r.score || 85,
              license:
                typeof r.license === 'string' ? r.license : r.license?.name || 'Approved Free',
            }));
          } catch {}
        }
      }

      const combined = [...extras, ...undrawResults].filter((item) => {
        if (!options.provider) return true;
        return item.provider === options.provider;
      });

      return {
        results: this.scoreCandidates(combined, trimmed),
        hasMore: hasMore && undrawResults.length > 0,
        page,
        total,
      };
    } catch (err) {
      console.error('Search error in autopic-bridge:', err);
      return {
        results: this.getMockResults(trimmed),
        hasMore: false,
        page,
        fallback: true,
      };
    }
  }

  public static async search(
    query: string,
    options: { provider?: string; color?: string; limit?: number; page?: number } = {}
  ): Promise<IllustrationCandidate[]> {
    const res = await this.searchWithPagination(query, options);
    return res.results;
  }

  public static async getSvgContent(
    slug: string,
    provider: string,
    color?: string,
    isDark?: boolean
  ): Promise<string> {
    const raw = await this.getRawSvg(slug, provider);
    const autopic = getAutopic();
    let svg = raw;

    if (color) {
      svg = autopic?.CustomizationEngine?.recolor
        ? autopic.CustomizationEngine.recolor(svg, color)
        : this.recolor(svg, color);
    }

    if (isDark) {
      svg = autopic?.CustomizationEngine?.customize
        ? autopic.CustomizationEngine.customize(svg, { isDarkMode: true })
        : this.darkAdapt(svg);
    }

    return svg;
  }

  private static async getRawSvg(slug: string, provider: string): Promise<string> {
    const key = `${provider || 'undraw'}:${slug}`;
    const cached = this.svgCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      this.svgCache.delete(key);
      this.svgCache.set(key, cached);
      return cached.value;
    }

    const inflight = this.inflightSvg.get(key);
    if (inflight) return inflight;

    const promise = (async () => {
      let svg = '';
      const autopic = getAutopic();

      if (autopic && typeof autopic.downloadIllustration === 'function') {
        try {
          const res = await autopic.downloadIllustration(provider || 'undraw', slug, {
            force: true,
            persist: false,
            primaryColor: undefined,
          });
          if (res && res.content) svg = res.content;
        } catch (err) {
          console.warn('Error in downloadIllustration, trying CDN fallback:', err);
        }
      }

      if (!svg && (provider === 'undraw' || !provider)) {
        const candidates = [
          `https://cdn.undraw.co/illustrations/${slug}.svg`,
          `https://cdn.undraw.co/illustration/${slug}.svg`,
          `https://42f2671d685f51e10fc6-b97432242619da7e9ee49640879d8cd8.ssl.cf2.rackcdn.com/${slug}.svg`,
        ];
        for (const url of candidates) {
          try {
            const resp = await fetch(url, { signal: createTimeoutSignal(8000) });
            if (resp.ok) {
              svg = await resp.text();
              break;
            }
          } catch {}
        }
      }

      if (!svg) {
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" width="100%" height="100%">
      <rect width="500" height="400" rx="16" fill="#1e293b"/>
      <circle cx="250" cy="180" r="70" fill="#6c63ff" opacity="0.8"/>
      <text x="250" y="320" text-anchor="middle" fill="#94a3b8" font-family="system-ui" font-size="18">${slug}</text>
    </svg>`;
      }

      this.svgCache.set(key, { value: svg, expiresAt: Date.now() + this.SVG_TTL });
      this.trimCache(this.svgCache);
      return svg;
    })();

    this.inflightSvg.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inflightSvg.delete(key);
    }
  }

  private static recolor(svg: string, color: string): string {
    return svg
      .replace(/#6c63ff/gi, color)
      .replace(/rgb\(108\s*,\s*99\s*,\s*255\)/gi, color)
      .replace(/#6366f1/gi, color)
      .replace(/#8b5cf6/gi, color);
  }

  private static darkAdapt(svg: string): string {
    return svg
      .replace(/#2f2e41/gi, '#94A3B8')
      .replace(/#3f3d56/gi, '#CBD5E1')
      .replace(/#e2e8f0/gi, '#334155')
      .replace(/stroke:\s*#000000/gi, 'stroke: #F8FAFC')
      .replace(/stroke="#000000"/gi, 'stroke="#F8FAFC"')
      .replace(/fill="#000000"/gi, 'fill="#F8FAFC"')
      .replace(/fill="#ffffff"/gi, 'fill="#1E293B"');
  }

  private static scoreCandidates(
    items: IllustrationCandidate[],
    query: string
  ): IllustrationCandidate[] {
    if (items.length === 0) return items;

    const autopic = getAutopic();
    if (!autopic?.ScoringEngine?.rank) return items;

    try {
      const context = autopic.inspectProject
        ? autopic.inspectProject(this.getProjectRoot(), query)
        : autopic.SearchEngine?.inspectProject
          ? autopic.SearchEngine.inspectProject(this.getProjectRoot(), query)
          : null;

      const licenseTypes: Record<string, string> = {
        openpeeps: 'CC0-1.0',
        iradesign: 'MIT',
        undraw: 'unDraw-License',
      };

      const ranked = autopic.ScoringEngine.rank(
        items.map((item) => ({
          ...item,
          providerId: item.provider,
          status: 'approved',
          license: { type: licenseTypes[item.provider] || 'UNKNOWN', name: item.license },
          tags: item.tags || [],
        })),
        { prompt: query || '', limit: items.length },
        context
      );

      const byId = new Map(items.map((item) => [item.id, item]));
      return ranked.map((rankedItem: any) => {
        const original = byId.get(rankedItem.id) || rankedItem;
        return {
          ...original,
          score: rankedItem.score ?? rankedItem.relevanceScore ?? original.score,
        };
      });
    } catch {
      return items;
    }
  }

  private static trimCache<T>(cache: Map<string, CacheEntry<T>>): void {
    while (cache.size > this.MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }

  public static getEngine(): any {
    return getAutopic();
  }

  public static clearCaches(): void {
    this.svgCache.clear();
    this.inflightSvg.clear();
    this.searchCache.clear();
  }

  public static getMockResults(query: string): IllustrationCandidate[] {
    return [
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
  }
}
