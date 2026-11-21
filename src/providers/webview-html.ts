import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getVersion(extensionUri: vscode.Uri): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(extensionUri.fsPath, 'package.json'), 'utf8')
    );
    return pkg.version || '0.1.6';
  } catch {
    return '0.1.6';
  }
}

export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  viewMode: 'sidebar' | 'studio'
): string {
  const distWebviewPath = vscode.Uri.joinPath(extensionUri, 'dist', 'webview');
  const indexHtmlPath = path.join(distWebviewPath.fsPath, 'index.html');

  if (fs.existsSync(indexHtmlPath)) {
    let html = fs.readFileSync(indexHtmlPath, 'utf8');
    const nonce = getNonce();
    const version = getVersion(extensionUri);

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
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; font-src ${webview.cspSource}; connect-src ${webview.cspSource} https:;">`;
    html = html.replace('<head>', `<head>\n    ${cspMeta}`);

    // Inject initial viewMode and version into window
    const injectedScript = `<script nonce="${nonce}">window.__AUTOPIC_VIEW_MODE__ = "${viewMode}"; window.__AUTOPIC_VERSION__ = "${version}";</script>`;
    html = html.replace('</head>', `    ${injectedScript}\n  </head>`);

    // Add nonce to Vite-generated module scripts
    html = html.replace(/<script(?![^>]*nonce)/g, `<script nonce="${nonce}"`);

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
