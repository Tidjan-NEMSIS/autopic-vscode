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

    // Remove crossorigin to avoid custom scheme CORS blocks
    html = html.replace(/crossorigin/g, '');

    // Inject CSP meta tag
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src 'unsafe-inline' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; font-src ${webview.cspSource}; connect-src ${webview.cspSource} https:;">`;
    html = html.replace('<head>', `<head>\n    ${cspMeta}`);

    // Inject initial viewMode into window
    const injectedScript = `<script>window.__AUTOPIC_VIEW_MODE__ = "${viewMode}";</script>`;
    html = html.replace('</head>', `    ${injectedScript}\n  </head>`);
    return html;
  }

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
