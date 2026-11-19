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

export class AutopicBridge {
  private static cachedBuildId: string | null = null;

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

    if (autopic && typeof autopic.inspectProject === 'function') {
      try {
        const inspection = autopic.inspectProject(root);
        if (inspection?.framework) framework = inspection.framework;
        if (inspection?.styling?.palette) palette = inspection.styling.palette;
      } catch (err) {
        console.error('Inspection failed:', err);
      }
    } else {
      const pkgPath = path.join(root, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps['next']) framework = 'nextjs';
          else if (deps['vue']) framework = 'vue';
          else if (deps['svelte']) framework = 'svelte';
          else if (deps['react']) framework = 'react';
        } catch {}
      }

      for (const twFile of ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs']) {
        const twPath = path.join(root, twFile);
        if (fs.existsSync(twPath)) {
          const content = fs.readFileSync(twPath, 'utf8');
          const hexMatch = content.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/);
          if (hexMatch) {
            palette = hexMatch[0];
            break;
          }
        }
      }
    }

    const activeColorTheme = vscode.window.activeColorTheme;
    isDark =
      activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
      activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;

    return {
      framework,
      palette,
      isDark,
      projectRoot: root,
    };
  }

  public static async getUndrawBuildId(): Promise<string> {
    if (this.cachedBuildId) return this.cachedBuildId;
    try {
      const resp = await fetch('https://undraw.co/illustrations');
      if (resp.ok) {
        const text = await resp.text();
        const match = text.match(/"buildId":"([^"]+)"/);
        if (match && match[1]) {
          this.cachedBuildId = match[1];
          return match[1];
        }
      }
    } catch {}
    return 'rgL-_q8RRpwRSWfQrSDDI';
  }

  public static async searchWithPagination(
    query: string,
    options: { provider?: string; color?: string; page?: number; limit?: number } = {}
  ): Promise<{ results: IllustrationCandidate[]; hasMore: boolean; page: number; total?: number }> {
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
        const resp = await fetch(dataUrl);
        if (resp.ok) {
          const json = await resp.json();
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
      };
    }

    // Mode 2: Keyword search with query (ex: "wallet", "empty", "login", "team")
    try {
      const searchPage = Math.max(0, page - 1);
      const url = `https://undraw.co/api/search?q=${encodeURIComponent(trimmed)}&page=${searchPage}`;
      const resp = await fetch(url, {
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
        const data = await resp.json();
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
        results: combined,
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
    color?: string
  ): Promise<string> {
    const autopic = getAutopic();
    if (autopic && typeof autopic.downloadIllustration === 'function') {
      try {
        const res = await autopic.downloadIllustration(provider || 'undraw', slug, {
          force: true, // Bypass cached colored files from disk
          primaryColor: undefined, // Keep raw #6c63ff intact for instant client recoloring
        });
        if (res && res.content) {
          let svg = res.content;
          if (color) {
            svg = svg
              .replace(/#6c63ff/gi, color)
              .replace(/#6C63FF/gi, color)
              .replace(/rgb\(108\s*,\s*99\s*,\s*255\)/gi, color)
              .replace(/#6366F1/gi, color);
          }
          return svg;
        }
      } catch (err) {
        console.warn('Error in downloadIllustration, trying CDN fallback:', err);
      }
    }

    // Direct CDN fetch for unDraw
    if (provider === 'undraw' || !provider) {
      const candidates = [
        `https://cdn.undraw.co/illustrations/${slug}.svg`,
        `https://cdn.undraw.co/illustration/${slug}.svg`,
        `https://42f2671d685f51e10fc6-b97432242619da7e9ee49640879d8cd8.ssl.cf2.rackcdn.com/${slug}.svg`,
      ];
      for (const url of candidates) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            let svg = await resp.text();
            if (color) {
              svg = svg
                .replace(/#6c63ff/gi, color)
                .replace(/#6C63FF/gi, color)
                .replace(/rgb\(108\s*,\s*99\s*,\s*255\)/gi, color)
                .replace(/#6366F1/gi, color);
            }
            return svg;
          }
        } catch {}
      }
    }

    // Generic fallback SVG with primary color
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" width="100%" height="100%">
      <rect width="500" height="400" rx="16" fill="#1e293b"/>
      <circle cx="250" cy="180" r="70" fill="${color || '#6c63ff'}" opacity="0.8"/>
      <text x="250" y="320" text-anchor="middle" fill="#94a3b8" font-family="system-ui" font-size="18">${slug}</text>
    </svg>`;
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
