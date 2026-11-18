import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  viewMode: 'sidebar' | 'studio'
): string {
  const distWebviewPath = vscode.Uri.joinPath(extensionUri, 'dist', 'webview');
  const indexHtmlPath = path.join(distWebviewPath.fsPath, 'index.html');

  if (fs.existsSync(indexHtmlPath)) {
    let html = fs.readFileSync(indexHtmlPath, 'utf8');

    // Replace relative assets paths with webview URIs
    html = html.replace(/(href|src)="\/?assets\/([^"]+)"/g, (match, attr, filename) => {
      const assetUri = webview.asWebviewUri(
        vscode.Uri.joinPath(distWebviewPath, 'assets', filename)
      );
      return `${attr}="${assetUri}"`;
    });

    // Inject initial viewMode into window
    const injectedScript = `<script>window.__AUTOPIC_VIEW_MODE__ = "${viewMode}";</script>`;
    html = html.replace('</head>', `${injectedScript}</head>`);
    return html;
  }

  // Fallback if webview not yet built
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: sans-serif; padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); }
      </style>
    </head>
    <body>
      <h2>Autopic Studio</h2>
      <p>Building interface... Please run <code>npm run build</code>.</p>
    </body>
  </html>`;
}
