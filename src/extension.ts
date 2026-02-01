import {
  type ExtensionContext,
  ExtensionMode,
  type QuickPickItem,
  RelativePattern,
  StatusBarAlignment,
  type StatusBarItem,
  type Uri,
  commands,
  window,
  workspace,
} from 'vscode';
import WebviewManager from './internal/webviewManager';

let webviewManager: WebviewManager | undefined;
let statusBarItem: StatusBarItem;

export function activate(context: ExtensionContext) {
  webviewManager = new WebviewManager(context);

  statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
  statusBarItem.command = 'embeddedAvd.start';
  context.subscriptions.push(statusBarItem);

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
      await webviewManager!.startEmulatorWebview(selection.label);

      statusBarItem.text = `$(device-mobile) AVD: ${selection.label}`;
      statusBarItem.show();

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
