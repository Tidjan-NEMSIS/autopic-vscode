import * as vscode from 'vscode';
import { HostToWebviewMessage, WebviewToHostMessage } from '../types/messages';
import { AutopicBridge } from './autopic-bridge';
import { CodeInjector } from './code-injector';

export type PostMessage = (message: HostToWebviewMessage) => void | Thenable<boolean>;

export async function handleWebviewMessage(
  message: WebviewToHostMessage,
  postMessage: PostMessage,
  sendProjectContext: () => Promise<void>
): Promise<void> {
  switch (message.command) {
    case 'ready':
    case 'refreshProject': {
      await sendProjectContext();
      break;
    }

    case 'search':
    case 'smart': {
      const query = message.command === 'smart' ? message.concept : message.query;
      const provider = message.command === 'smart' ? undefined : message.provider;
      const color = message.command === 'smart' ? undefined : message.color;
      const page = message.command === 'smart' ? 0 : message.page;
      const append = message.command === 'smart' ? false : !!message.append;

      if (!append) {
        await postMessage({
          type: 'searchResults',
          query,
          results: [],
          loading: true,
          append: false,
        });
      }

      const data = await AutopicBridge.searchWithPagination(query, {
        provider,
        color,
        page: page !== undefined ? page : query ? 0 : 1,
      });

      await postMessage({
        type: 'searchResults',
        query,
        results: data.results,
        page: data.page,
        hasMore: data.hasMore,
        total: data.total,
        fallback: data.fallback,
        append,
        loading: false,
      });
      break;
    }

    case 'getSvg': {
      const svg = await AutopicBridge.getSvgContent(
        message.slug,
        message.provider,
        message.color,
        message.isDark
      );
      await postMessage({
        type: 'svgContent',
        slug: message.slug,
        svg,
        provider: message.provider,
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
      const svg = await AutopicBridge.getSvgContent(
        message.candidate.slug,
        message.candidate.provider,
        message.color
      );
      const targetUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(
          `${root}/public/illustrations/${message.candidate.slug}.svg`
        ),
        filters: { 'Scalable Vector Graphics (*.svg)': ['svg'] },
      });
      if (targetUri) {
        await vscode.workspace.fs.writeFile(targetUri, Buffer.from(svg, 'utf8'));
        vscode.window.showInformationMessage(`SVG enregistré : ${targetUri.fsPath}`);
      }
      break;
    }

    case 'copySvg': {
      const svg = await AutopicBridge.getSvgContent(
        message.candidate.slug,
        message.candidate.provider,
        message.color
      );
      await vscode.env.clipboard.writeText(svg);
      vscode.window.showInformationMessage('Code SVG copié dans le presse-papier.');
      break;
    }

    case 'openStudio': {
      vscode.commands.executeCommand('autopic.openStudio');
      break;
    }
  }
}
