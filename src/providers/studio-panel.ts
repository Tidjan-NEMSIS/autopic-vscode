import * as vscode from 'vscode';
import { getWebviewContent } from './webview-html';
import { WebviewToHostMessage } from '../types/messages';
import { AutopicBridge } from '../services/autopic-bridge';
import { handleWebviewMessage } from '../services/message-router';

export class AutopicStudioPanel {
  public static currentPanel: AutopicStudioPanel | undefined;
  public static readonly viewType = 'autopic.studioPanel';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (AutopicStudioPanel.currentPanel) {
      AutopicStudioPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      AutopicStudioPanel.viewType,
      'Autopic Studio — Illustrations',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    AutopicStudioPanel.currentPanel = new AutopicStudioPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.iconPath = {
      light: vscode.Uri.joinPath(this._extensionUri, 'assets', 'icons', 'autopic.svg'),
      dark: vscode.Uri.joinPath(this._extensionUri, 'assets', 'icons', 'autopic.svg'),
    };

    this._panel.webview.html = getWebviewContent(
      this._panel.webview,
      this._extensionUri,
      'studio'
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (data: WebviewToHostMessage) => {
        await handleWebviewMessage(
          data,
          (message) => this._panel.webview.postMessage(message),
          () => this.sendProjectContext()
        );
      },
      null,
      this._disposables
    );

    this.sendProjectContext();
  }

  public async sendProjectContext() {
    const context = await AutopicBridge.scanProject();
    this._panel.webview.postMessage({
      type: 'projectContext',
      context,
    });
  }

  public dispose() {
    AutopicStudioPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }
}
