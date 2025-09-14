import {
  commands,
  ExtensionContext,
  ExtensionMode,
  QuickPickItem,
  RelativePattern,
  Uri,
  window,
  workspace,
} from 'vscode';
import WebviewManager from './internal/webviewManager';

let webviewManager: WebviewManager | undefined;

export function activate(context: ExtensionContext) {
  webviewManager = new WebviewManager(context);
  if (context.extensionMode === ExtensionMode.Development) {
    watchWebviewChanges(context, webviewManager.webViewDirUri);
  }

  context.subscriptions.push(
    commands.registerCommand('embeddedAvd.start', async () => {
      const emulators =
        await webviewManager!.avdManager.getAvailableEmulators();
      const items: QuickPickItem[] = emulators.map((emulator) => ({
        label: emulator,
      }));
      const selection = await window.showQuickPick(items, {
        placeHolder: 'Select an emulator to start',
        canPickMany: false,
      });
      if (!selection) return;
      await webviewManager!.startEmulatorWebview(selection.label, 8554);
      window.showInformationMessage(`Started emulator ${selection.label}`);
    }),
  );
}

function watchWebviewChanges(_context: ExtensionContext, webViewDir: Uri) {
  const watcher = workspace.createFileSystemWatcher(
    new RelativePattern(webViewDir, '**'),
  );
  commands.executeCommand('workbench.action.webview.reloadWebviewAction');
  watcher.onDidChange(() => {
    commands.executeCommand('workbench.action.webview.reloadWebviewAction');
  });
  watcher.onDidCreate(() => {
    commands.executeCommand('workbench.action.webview.reloadWebviewAction');
  });
  watcher.onDidDelete(() => {
    commands.executeCommand('workbench.action.webview.reloadWebviewAction');
  });
}

export function deactivate() {
  webviewManager?.dispose();
}
