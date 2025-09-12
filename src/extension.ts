import * as vscode from 'vscode';
import { EmulatorManager } from './emulatorManager';
import path from 'path';
import fs from 'fs';
import MediaUtils from './utils/media';
import { generateRandomString, template } from './utils/helpers';
import {
  FrameUpdatePayload,
  IncomingPayloadFromWebview,
} from './interfaces/payload';

export function activate(context: vscode.ExtensionContext) {
  let panel: vscode.WebviewPanel | undefined;
  const emulatorManager = new EmulatorManager();

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
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, 'webview-ui')),
          ],
        },
      );

      // Read configuration
      const config = vscode.workspace.getConfiguration('androidEmulator');
      // TODO: remove
      const emulatorPath =
        config.get<string>('emulatorPath') ||
        '/Users/deepak/Library/Android/sdk/emulator/emulator';
      const avdName = config.get<string>('avdName') || 'Medium_Phone';
      if (!emulatorPath || !avdName) {
        vscode.window.showErrorMessage(
          'Please configure emulator path and AVD name first.',
        );
        panel.dispose();
        return;
      }
      vscode.window.showInformationMessage(
        `Starting emulator: ${emulatorPath}\nAVD: ${avdName}`,
      );

      // Start emulator and connect gRPC

      // TODO: When to start and stream the emulator
      emulatorManager.startEmulator(emulatorPath, avdName, 8554);
      setTimeout(() => emulatorManager.connectGrpc(8554), 5000); // Wait for emulator to start

      // Periodically fetch screenshot and send to WebView
      const interval = setInterval(() => {
        emulatorManager.getScreenshot(async (image: Uint8Array) => {
          if (!image) {
            return;
          }
          const compressedImage = await MediaUtils.compressImage(image);
          console.log('Compressed image size:', compressedImage?.data?.length);
          if (!compressedImage) return;
          panel?.webview.postMessage({
            type: 'frame',
            data: compressedImage.data.toString('base64'),
            mimetype: compressedImage.mimetype,
            size: compressedImage.size,
          } satisfies FrameUpdatePayload);
        });
      }, 1000); // ~10 FPS

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
        clearInterval(interval);
        emulatorManager.dispose();
      });
    }),
  );
}

function getWebviewContent(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
) {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'webview-ui', 'main.js'),
  );

  const styleMainUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'webview-ui', 'main.css'),
  );

  const nonce = generateRandomString({ length: 32 });

  const htmlPath = path.join(context.extensionPath, 'webview-ui', 'index.html');

  let html = fs.readFileSync(htmlPath, 'utf8');

  html = template(html, {
    nonce: nonce,
    cspSource: webview.cspSource,
    scriptUri: scriptUri.toString(),
    stylesMainUri: styleMainUri.toString(),
  });

  return html;
}
