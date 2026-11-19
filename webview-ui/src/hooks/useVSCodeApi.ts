declare function acquireVsCodeApi(): {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

declare global {
  interface Window {
    __VSCODE_API_SINGLETON__?: ReturnType<typeof acquireVsCodeApi>;
  }
}

function getApi() {
  if (typeof window !== 'undefined') {
    if (!window.__VSCODE_API_SINGLETON__ && typeof acquireVsCodeApi === 'function') {
      try {
        window.__VSCODE_API_SINGLETON__ = acquireVsCodeApi();
      } catch (e) {
        console.warn('VS Code API already acquired or unavailable:', e);
      }
    }
    return window.__VSCODE_API_SINGLETON__;
  }
  return undefined;
}

export const vscode = {
  postMessage: (message: any) => {
    const api = getApi();
    if (api) {
      api.postMessage(message);
    } else {
      console.log('Mock VS Code postMessage:', message);
    }
  },
  getState: () => {
    const api = getApi();
    return api ? api.getState() : null;
  },
  setState: (state: any) => {
    const api = getApi();
    if (api) api.setState(state);
  },
};
