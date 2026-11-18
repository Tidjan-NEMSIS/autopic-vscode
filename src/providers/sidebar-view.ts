import * as vscode from 'vscode';
import { getWebviewContent } from './webview-html';
import { WebviewToHostMessage } from '../types/messages';
import { AutopicBridge } from '../services/autopic-bridge';
import { CodeInjector } from '../services/code-injector';

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

    // Message handler
    webviewView.webview.onDidReceiveMessage(async (data: WebviewToHostMessage) => {
      await this.handleMessage(data);
    });

    // Auto-send project context on load
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

  private async handleMessage(message: WebviewToHostMessage) {
    if (!this._view) return;

    switch (message.command) {
      case 'refreshProject':
        await this.sendProjectContext();
        break;

      case 'search': {
        this._view.webview.postMessage({
          type: 'searchResults',
          query: message.query,
          results: [],
          loading: true,
        });

        const results = await AutopicBridge.search(message.query, {
          provider: message.provider,
          color: message.color,
        });

        this._view.webview.postMessage({
          type: 'searchResults',
          query: message.query,
          results,
          loading: false,
        });
        break;
      }

      case 'getSvg': {
        const svg = await AutopicBridge.getSvgContent(message.slug, message.provider, message.color);
        this._view.webview.postMessage({
          type: 'svgContent',
          slug: message.slug,
          svg,
        });
        break;
      }

      case 'insertAtCursor': {
        await CodeInjector.insertIllustrationAtCursor({
          candidate: message.candidate,
          color: message.color,
          framework: message.framework,
        });
        break;
      }

      case 'downloadSvg': {
        const root = AutopicBridge.getProjectRoot();
        const svg = await AutopicBridge.getSvgContent(message.candidate.slug, message.candidate.provider, message.color);
        const targetUri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(`${root}/public/illustrations/${message.candidate.slug}.svg`),
          filters: { 'Scalable Vector Graphics (*.svg)': ['svg'] },
        });
        if (targetUri) {
          const fs = require('fs');
          fs.writeFileSync(targetUri.fsPath, svg, 'utf8');
          vscode.window.showInformationMessage(`✔ SVG enregistré : ${targetUri.fsPath}`);
        }
        break;
      }

      case 'copySvg': {
        const svg = await AutopicBridge.getSvgContent(message.candidate.slug, message.candidate.provider, message.color);
        await vscode.env.clipboard.writeText(svg);
        vscode.window.showInformationMessage('✔ Code SVG copié dans le presse-papier !');
        break;
      }

      case 'openStudio': {
        vscode.commands.executeCommand('autopic.openStudio');
        break;
      }
    }
  }
}
