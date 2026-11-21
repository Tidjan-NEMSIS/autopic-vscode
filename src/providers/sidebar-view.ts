import * as vscode from 'vscode';
import { getWebviewContent } from './webview-html';
import { WebviewToHostMessage } from '../types/messages';
import { AutopicBridge } from '../services/autopic-bridge';
import { handleWebviewMessage } from '../services/message-router';

export class AutopicSidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'autopic.sidebarView';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = getWebviewContent(
      webviewView.webview,
      this._extensionUri,
      'sidebar'
    );

    webviewView.webview.onDidReceiveMessage(async (data: WebviewToHostMessage) => {
      await handleWebviewMessage(
        data,
        (message) => webviewView.webview.postMessage(message),
        () => this.sendProjectContext()
      );
    });

    this.sendProjectContext();
  }

  public async sendProjectContext() {
    if (!this._view) return;
    const context = await AutopicBridge.scanProject();
    this._view.webview.postMessage({
      type: 'projectContext',
      context,
    });
  }
}
