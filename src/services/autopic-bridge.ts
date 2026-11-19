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
    isDark = activeColorTheme.kind === vscode.ColorThemeKind.Dark || activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;

    return {
      framework,
      palette,
      isDark,
      projectRoot: root,
    };
  }

  public static async search(
    query: string,
    options: { provider?: string; color?: string; limit?: number } = {}
  ): Promise<IllustrationCandidate[]> {
    const autopic = getAutopic();
    if (!autopic || typeof autopic.searchIllustrations !== 'function') {
      return this.getMockResults(query);
    }

    try {
      const results = await autopic.searchIllustrations(query || 'empty', {
        providers: options.provider ? [options.provider] : undefined,
        color: options.color,
        limit: options.limit || 16,
      });

      if (!results || !Array.isArray(results) || results.length === 0) {
        return this.getMockResults(query);
      }

      return results.map((r: any) => {
        const pId = r.providerId || r.provider || 'undraw';
        const pName = r.providerName || (pId === 'undraw' ? 'unDraw' : pId === 'openpeeps' ? 'Open Peeps' : pId === 'iradesign' ? 'IRA Design' : pId);
        
        let licenseStr = 'Approved Free';
        if (typeof r.license === 'string') {
          licenseStr = r.license;
        } else if (r.license && typeof r.license === 'object') {
          licenseStr = r.license.name || r.license.type || 'Approved Free';
        }

        return {
          id: r.id || `${pId}:${r.slug}`,
          slug: r.slug || r.id,
          title: r.title || r.slug || 'Illustration',
          provider: pId,
          providerName: pName,
          score: r.score || r.relevanceScore || 85,
          tags: r.tags || [],
          svgUrl: r.svgUrl || r.thumbnailUrl || r.url,
          license: licenseStr,
        };
      });
    } catch (err) {
      console.error('Autopic search error:', err);
      return this.getMockResults(query);
    }
  }

  public static async getSvgContent(slug: string, provider: string, color?: string): Promise<string> {
    const autopic = getAutopic();
    if (autopic && typeof autopic.downloadIllustration === 'function') {
      try {
        const res = await autopic.downloadIllustration(provider || 'undraw', slug, {
          primaryColor: color,
        });
        if (res && res.content) return res.content;
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
              svg = svg.replace(/#6c63ff/gi, color);
            }
            return svg;
          }
        } catch {}
      }
    }

    // Generic fallback SVG with primary color
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" width="100%" height="100%">
      <rect width="500" height="400" rx="16" fill="#1e293b"/>
      <circle cx="250" cy="180" r="70" fill="${color || '#3B82F6'}" opacity="0.8"/>
      <text x="250" y="320" text-anchor="middle" fill="#94a3b8" font-family="system-ui" font-size="18">${slug}</text>
    </svg>`;
  }

  private static getMockResults(query: string): IllustrationCandidate[] {
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
  }
}
