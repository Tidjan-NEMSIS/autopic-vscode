import { useEffect, useSyncExternalStore } from 'react';
import { vscode } from '../hooks/useVSCodeApi';

const cache = new Map<string, string>();
const pending = new Set<string>();
const listeners = new Map<string, Set<() => void>>();

export function svgKey(slug: string, provider?: string): string {
  return provider ? `${provider}:${slug}` : slug;
}

export function setSvg(slug: string, svg: string, provider?: string): void {
  const key = svgKey(slug, provider);
  cache.set(key, svg);
  pending.delete(key);
  listeners.get(key)?.forEach((listener) => listener());
}

export function requestSvg(slug: string, provider: string): void {
  const key = svgKey(slug, provider);
  if (!slug || cache.has(key) || pending.has(key)) return;

  pending.add(key);
  vscode.postMessage({
    command: 'getSvg',
    slug,
    provider,
  });
}

export function getSvg(slug: string, provider?: string): string | null {
  return cache.get(svgKey(slug, provider)) ?? null;
}

function subscribe(key: string, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);

  return () => {
    set?.delete(listener);
    if (set?.size === 0) listeners.delete(key);
  };
}

export function useSvg(slug: string, provider: string, enabled = true): string | null {
  const key = svgKey(slug, provider);
  const value = useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => cache.get(key) ?? null,
    () => null
  );

  useEffect(() => {
    if (enabled) requestSvg(slug, provider);
  }, [enabled, slug, provider]);

  return value;
}
