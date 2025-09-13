import {
  commands,
  ExtensionContext,
  ExtensionMode,
  RelativePattern,
  Uri,
  workspace,
} from 'vscode';
import WebviewManager from './internal/webviewManager';
import { EmulatorManager } from './internal/emulatorManager';

export function activate(context: ExtensionContext) {
  if (context.extensionMode === ExtensionMode.Development) {
    watchWebviewChanges(context, WebviewManager.webViewDirUri(context));
  }

  context.subscriptions.push(
    commands.registerCommand('androidEmulator.open', async () => {
      const emulatorManager = new EmulatorManager();
      const webviewManager = new WebviewManager(context, emulatorManager);
      webviewManager.createPanel();
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
