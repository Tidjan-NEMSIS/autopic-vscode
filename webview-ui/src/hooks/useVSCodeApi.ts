declare function acquireVsCodeApi(): {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

class VSCodeAPIWrapper {
  private readonly vscodeApi: ReturnType<typeof acquireVsCodeApi> | undefined;

  constructor() {
    if (typeof acquireVsCodeApi === 'function') {
      this.vscodeApi = acquireVsCodeApi();
    }
  }

  public postMessage(message: any) {
    if (this.vscodeApi) {
      this.vscodeApi.postMessage(message);
    } else {
      console.log('Mock VS Code postMessage:', message);
    }
  }

  public getState(): any {
    return this.vscodeApi ? this.vscodeApi.getState() : null;
  }

  public setState(state: any) {
    if (this.vscodeApi) {
      this.vscodeApi.setState(state);
    }
  }
}

export const vscode = new VSCodeAPIWrapper();
