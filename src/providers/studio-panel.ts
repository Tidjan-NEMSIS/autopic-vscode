import * as vscode from 'vscode';
import { getWebviewContent } from './webview-html';
import { WebviewToHostMessage } from '../types/messages';
import { AutopicBridge } from '../services/autopic-bridge';
import { CodeInjector } from '../services/code-injector';

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
        await this.handleMessage(data);
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

  private async handleMessage(message: WebviewToHostMessage) {
    switch (message.command) {
      case 'refreshProject':
        await this.sendProjectContext();
        break;

      case 'search': {
        if (!message.append) {
          this._panel.webview.postMessage({
            type: 'searchResults',
            query: message.query,
            results: [],
            loading: true,
            append: false,
          });
        }

        const data = await AutopicBridge.searchWithPagination(message.query, {
          provider: message.provider,
          color: message.color,
          page: message.page !== undefined ? message.page : (message.query ? 0 : 1),
        });

        this._panel.webview.postMessage({
          type: 'searchResults',
          query: message.query,
          results: data.results,
          page: data.page,
          hasMore: data.hasMore,
          total: data.total,
          append: !!message.append,
          loading: false,
        });
        break;
      }

      case 'getSvg': {
        const svg = await AutopicBridge.getSvgContent(message.slug, message.provider, message.color);
        this._panel.webview.postMessage({
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
    }
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
