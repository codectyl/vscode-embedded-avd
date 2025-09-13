import * as vscode from 'vscode';
import { EmulatorManager } from './internal/emulatorManager';
import path from 'path';
import fs from 'fs';
import { generateRandomString, template } from './utils/helpers';
import { IncomingPayloadFromWebview } from './interfaces/payload';

export function activate(context: vscode.ExtensionContext) {
  let panel: vscode.WebviewPanel | undefined;
  const emulatorManager = new EmulatorManager();

  const webViewDirUri = vscode.Uri.file(
    path.join(context.extensionPath, 'dist', 'webview-ui'),
  );

  if (context.extensionMode === vscode.ExtensionMode.Development) {
    watchWebviewChanges(context, webViewDirUri);
  }

  function getWebviewContent(
    _context: vscode.ExtensionContext,
    webview: vscode.Webview,
  ) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webViewDirUri, 'main.js'),
    );

    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webViewDirUri, 'main.css'),
    );

    const nonce = generateRandomString({ length: 32 });

    const htmlPath = path.join(webViewDirUri.path, 'index.html');

    let html = fs.readFileSync(htmlPath, 'utf8');

    html = template(html, {
      nonce: nonce,
      cspSource: webview.cspSource,
      scriptUri: scriptUri.toString(),
      stylesMainUri: styleMainUri.toString(),
    });

    return html;
  }

  // Register configuration settings
  context.subscriptions.push(
    vscode.commands.registerCommand('androidEmulator.configure', async () => {
      const emulatorPath = await vscode.window.showInputBox({
        prompt: 'Enter path to Android Emulator binary',
      });
      const avdName = await vscode.window.showInputBox({
        prompt: 'Enter AVD name',
      });
      if (emulatorPath && avdName) {
        await vscode.workspace
          .getConfiguration()
          .update(
            'androidEmulator.emulatorPath',
            emulatorPath,
            vscode.ConfigurationTarget.Global,
          );
        await vscode.workspace
          .getConfiguration()
          .update(
            'androidEmulator.avdName',
            avdName,
            vscode.ConfigurationTarget.Global,
          );
        vscode.window.showInformationMessage('Emulator configuration saved.');
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('androidEmulator.open', async () => {
      panel = vscode.window.createWebviewPanel(
        'androidEmulator',
        'Android Emulator',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [webViewDirUri],
        },
      );

      panel.webview.html = getWebviewContent(context, panel.webview);

      panel.webview.onDidReceiveMessage(
        (payload: IncomingPayloadFromWebview) => {
          if (payload.type === 'touch') {
            emulatorManager.sendTouch(payload);
          }
          if (payload.type === 'multiTouch') {
            emulatorManager.sendMultiTouch(payload);
          }
          if (payload.type === 'key') {
            emulatorManager.sendKey(payload);
          }
        },
      );

      panel.onDidDispose(() => {
        emulatorManager.dispose();
      });
    }),
  );
}

function watchWebviewChanges(
  _context: vscode.ExtensionContext,
  webViewDir: vscode.Uri,
) {
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(webViewDir, '**'),
  );
  vscode.commands.executeCommand(
    'workbench.action.webview.reloadWebviewAction',
  );
  watcher.onDidChange(() => {
    vscode.commands.executeCommand(
      'workbench.action.webview.reloadWebviewAction',
    );
  });
  watcher.onDidCreate(() => {
    vscode.commands.executeCommand(
      'workbench.action.webview.reloadWebviewAction',
    );
  });
  watcher.onDidDelete(() => {
    vscode.commands.executeCommand(
      'workbench.action.webview.reloadWebviewAction',
    );
  });
}
