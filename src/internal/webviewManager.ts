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
import {
  ExtensionToWebviewPayload,
  FrameUpdatePayload,
  WebviewToExtensionPayload,
} from '../interfaces/payload';
import AvdManager from './avdManager';
import { readFile } from 'fs/promises';
import MediaUtils from '../utils/media';
import { ClientReadableStream } from '@grpc/grpc-js';
import { Image } from '../generated/emulator_controller';

class WebviewManager {
  avdManager = new AvdManager();

  instances: Map<string, EmulatorWebviewManager> = new Map();

  get webViewDirUri() {
    return Uri.file(
      path.join(this.context.extensionPath, 'dist', 'webview-ui'),
    );
  }

  constructor(public context: ExtensionContext) {}

  async startEmulatorWebview(avdName: string, port: number) {
    if (this.instances.has(avdName)) {
      const instance = this.instances.get(avdName);
      instance?.panel.reveal(ViewColumn.Beside);
      return instance;
    }
    const emulatorManager = await this.avdManager.startEmulator(avdName, port);
    const newInstance = new EmulatorWebviewManager(this, emulatorManager);
    this.instances.set(avdName, newInstance);
    return newInstance;
  }

  dispose() {
    this.instances.forEach((instance) => instance.dispose());
    this.instances.clear();
  }
}

class EmulatorWebviewManager {
  async getWebviewContent(
    _context: ExtensionContext,
    webview: Webview,
  ): Promise<string> {
    const webViewDirUri = this.webviewManager.webViewDirUri;
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(webViewDirUri, 'main.js'),
    );
    const styleMainUri = webview.asWebviewUri(
      Uri.joinPath(webViewDirUri, 'css', 'main.css'),
    );
    const nonce = generateRandomString({ length: 32 });
    const htmlPath = path.join(webViewDirUri.path, 'index.html');
    let html = await readFile(htmlPath, 'utf8');
    html = template(html, {
      nonce: nonce,
      cspSource: webview.cspSource,
      scriptUri: scriptUri.toString(),
      stylesMainUri: styleMainUri.toString(),
    });
    return html;
  }

  panel!: WebviewPanel;

  constructor(
    private webviewManager: WebviewManager,
    private emulatorManager: EmulatorManager,
  ) {
    (async () => {
      this.panel = await this.createPanel();
    })();
  }

  postMessage(payload: ExtensionToWebviewPayload) {
    return this.panel.webview.postMessage(payload);
  }

  frameStream: ClientReadableStream<Image> | undefined;

  async streamFrames() {
    if (this.frameStream) return;
    let isProcessing = false;
    this.frameStream = this.emulatorManager.streamScreenshot({ width: 360 });

    this.frameStream.on('data', async (frame: Image) => {
      if (isProcessing) return;
      if (!frame || !frame.image) return;
      try {
        isProcessing = true;

        // Compress the image before sending to webview
        // Maybe we can do this in another web worker for better performance
        const compressedImage = await MediaUtils.compressImage(frame.image);
        if (!compressedImage) return;
        await this.postMessage({
          type: 'frame',
          data: compressedImage.data,
          mimetype: compressedImage.mimetype,
          size: compressedImage.size,
          actualFrameSize: {
            width: frame.format?.width ?? compressedImage.size.width,
            height: frame.format?.height ?? compressedImage.size.height,
          },
        } satisfies FrameUpdatePayload);
      } finally {
        isProcessing = false;
      }
    });

    this.frameStream.on('end', () => {
      isProcessing = false;
    });

    this.frameStream.on('error', () => {
      isProcessing = false;
    });
  }

  dispose() {
    this.panel?.dispose();
    this.emulatorManager.dispose();
  }

  private async createPanel(): Promise<WebviewPanel> {
    const webViewDirUri = this.webviewManager.webViewDirUri;
    let panel = window.createWebviewPanel(
      'embeddedAvd',
      this.emulatorManager.avdName,
      ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [webViewDirUri],
      },
    );

    panel.webview.html = await this.getWebviewContent(
      this.webviewManager.context,
      panel.webview,
    );

    panel.webview.onDidReceiveMessage(
      async (payload: WebviewToExtensionPayload) => {
        switch (payload.type) {
          case 'listEmulators':
            const emulators =
              await this.webviewManager.avdManager.getAvailableEmulators();
            await this.postMessage({
              type: 'listEmulatorsResponse',
              emulators: emulators,
            });
            return;
          case 'touch':
            return this.emulatorManager.sendTouch(payload);
          case 'key':
            return this.emulatorManager.sendKey(payload);
          case 'multiTouch':
            return this.emulatorManager.sendMultiTouch(payload);
          case 'startEmulator':
            // TODO: Randomize gRPC port in case of multiple emulators
            return this.webviewManager.startEmulatorWebview(payload.name, 8554);
        }
      },
    );

    panel.onDidDispose(() => {
      this.emulatorManager.dispose();
      this.frameStream?.cancel();
      this.frameStream?.destroy();
      this.webviewManager.instances.delete(this.emulatorManager.avdName);
    });

    this.streamFrames();

    return panel;
  }
}

export default WebviewManager;
