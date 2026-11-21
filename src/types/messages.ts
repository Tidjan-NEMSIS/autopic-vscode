export interface IllustrationCandidate {
  id: string;
  slug: string;
  title: string;
  provider: 'undraw' | 'openpeeps' | 'iradesign' | 'storyset' | 'drawkit' | 'manypixels';
  providerName: string;
  score: number;
  tags?: string[];
  svgUrl?: string;
  svgContent?: string;
  license: string;
}

export interface ProjectContext {
  framework: 'react' | 'nextjs' | 'vue' | 'svelte' | 'flutter' | 'html';
  palette: string;
  isDark: boolean;
  projectRoot?: string;
}

export type WebviewToHostMessage =
  | { command: 'ready' }
  | {
      command: 'search';
      query: string;
      provider?: string;
      color?: string;
      page?: number;
      append?: boolean;
    }
  | { command: 'smart'; concept: string }
  | { command: 'getSvg'; slug: string; provider: string; color?: string; isDark?: boolean }
  | {
      command: 'insertAtCursor';
      candidate: IllustrationCandidate;
      color: string;
      framework?: string;
    }
  | { command: 'downloadSvg'; candidate: IllustrationCandidate; color: string }
  | { command: 'copySvg'; candidate: IllustrationCandidate; color: string }
  | { command: 'refreshProject' }
  | { command: 'openStudio' };

export type HostToWebviewMessage =
  | { type: 'projectContext'; context: ProjectContext }
  | {
      type: 'searchResults';
      query: string;
      results: IllustrationCandidate[];
      loading: boolean;
      page?: number;
      hasMore?: boolean;
      append?: boolean;
      total?: number;
      fallback?: boolean;
    }
  | { type: 'svgContent'; slug: string; svg: string; provider?: string }
  | { type: 'status'; message: string; level: 'info' | 'success' | 'error' };
