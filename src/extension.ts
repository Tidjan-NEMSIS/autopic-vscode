import * as vscode from 'vscode';
import { AutopicSidebarViewProvider } from './providers/sidebar-view';
import { AutopicStudioPanel } from './providers/studio-panel';
import { AutopicBridge } from './services/autopic-bridge';
import { CodeInjector } from './services/code-injector';

export function activate(context: vscode.ExtensionContext) {
  console.log('🎯 Autopic Studio is now active!');

  // 1. Register Sidebar Webview Provider
  const sidebarProvider = new AutopicSidebarViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      AutopicSidebarViewProvider.viewType,
      sidebarProvider
    )
  );

  // 2. Command: Open Studio (Full Screen)
  context.subscriptions.push(
    vscode.commands.registerCommand('autopic.openStudio', () => {
      AutopicStudioPanel.createOrShow(context.extensionUri);
    })
  );

  // 3. Command: Refresh Project Context
  context.subscriptions.push(
    vscode.commands.registerCommand('autopic.refresh', async () => {
      await sidebarProvider.sendProjectContext();
      if (AutopicStudioPanel.currentPanel) {
        await AutopicStudioPanel.currentPanel.sendProjectContext();
      }
      vscode.window.showInformationMessage('🔄 Autopic: Contexte du projet et palette actualisés !');
    })
  );

  // 4. Command: Quick Insert at Cursor via QuickPick
  context.subscriptions.push(
    vscode.commands.registerCommand('autopic.insertAtCursor', async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Rechercher une illustration pour insérer au curseur',
        placeHolder: 'ex: empty wallet, 404, login, team, analytics...',
      });

      if (!query) return;

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Recherche Autopic pour "${query}"...`,
          cancellable: false,
        },
        async () => {
          const results = await AutopicBridge.search(query, { limit: 5 });
          if (!results || results.length === 0) {
            vscode.window.showWarningMessage(`Aucune illustration trouvée pour "${query}".`);
            return;
          }

          const items = results.map((r) => ({
            label: r.title,
            description: `[${r.providerName}] Score: ${r.score}%`,
            detail: `Licence: ${r.license} • Slug: ${r.slug}`,
            candidate: r,
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Sélectionnez l\'illustration à injecter',
          });

          if (selected) {
            const project = await AutopicBridge.scanProject();
            await CodeInjector.insertIllustrationAtCursor({
              candidate: selected.candidate,
              color: project.palette,
            });
          }
        }
      );
    })
  );
}

export function deactivate() {
  if (AutopicStudioPanel.currentPanel) {
    AutopicStudioPanel.currentPanel.dispose();
  }
}
