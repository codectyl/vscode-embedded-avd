import path from 'path';
import {
  ExtensionContext,
  Uri,
  ViewColumn,
  Webview,
  WebviewPanel,
  window,
} from 'vscode';
import { generateRandomString, template } from '../utils/helpers';
import { EmulatorManager } from './emulatorManager';
import { readFileSync } from 'fs';
import { IncomingPayloadFromWebview } from '../interfaces/payload';

class WebviewManager {
  static webViewDirUri = (context: ExtensionContext) =>
    Uri.file(path.join(context.extensionPath, 'dist', 'webview-ui'));

  static getWebviewContent = (_context: ExtensionContext, webview: Webview) => {
    const webViewDirUri = WebviewManager.webViewDirUri(_context);
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(webViewDirUri, 'main.js'),
    );
    const styleMainUri = webview.asWebviewUri(
      Uri.joinPath(webViewDirUri, 'css', 'main.css'),
    );
    const nonce = generateRandomString({ length: 32 });
    const htmlPath = path.join(webViewDirUri.path, 'index.html');
    let html = readFileSync(htmlPath, 'utf8');
    html = template(html, {
      nonce: nonce,
      cspSource: webview.cspSource,
      scriptUri: scriptUri.toString(),
      stylesMainUri: styleMainUri.toString(),
    });
    return html;
  };

  constructor(
    private context: ExtensionContext,
    private emulatorManager: EmulatorManager,
  ) {}

  createPanel(): WebviewPanel {
    const webViewDirUri = WebviewManager.webViewDirUri(this.context);
    let panel = window.createWebviewPanel(
      'androidEmulator',
      'Android Emulator',
      ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [webViewDirUri],
      },
    );

    panel.webview.html = WebviewManager.getWebviewContent(
      this.context,
      panel.webview,
    );

    panel.webview.onDidReceiveMessage((payload: IncomingPayloadFromWebview) => {
      if (payload.type === 'touch') {
        this.emulatorManager.sendTouch(payload);
      }
      if (payload.type === 'multiTouch') {
        this.emulatorManager.sendMultiTouch(payload);
      }
      if (payload.type === 'key') {
        this.emulatorManager.sendKey(payload);
      }
    });

    panel.onDidDispose(() => {
      this.emulatorManager.dispose();
    });

    return panel;
  }
}

export default WebviewManager;
