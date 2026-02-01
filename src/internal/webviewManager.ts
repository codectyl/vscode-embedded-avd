import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ClientReadableStream } from '@grpc/grpc-js';
import {
  type ExtensionContext,
  Uri,
  ViewColumn,
  type Webview,
  type WebviewPanel,
  window,
} from 'vscode';
import {
  type DisplayConfigurations,
  type Image,
  ImageFormat_ImgFormat,
} from '../generated/emulator_controller';
import type {
  ExtensionToWebviewPayload,
  WebviewToExtensionPayload,
} from '../interfaces/payload';
import { generateRandomString, template } from '../utils/helpers';
import AvdManager from './avdManager';
import type { EmulatorManager } from './emulatorManager';
import WebSocketHelper from './helpers/websocket-helper';

class WebviewManager {
  avdManager = new AvdManager();

  instances: Map<string, EmulatorWebviewManager> = new Map();

  get webViewDirUri() {
    return Uri.file(
      path.join(this.context.extensionPath, 'dist', 'webview-ui'),
    );
  }

  constructor(public context: ExtensionContext) {}

  async startEmulatorWebview(avdName: string, port?: number) {
    if (this.instances.has(avdName)) {
      const instance = this.instances.get(avdName);
      instance?.panel.reveal(ViewColumn.Two);
      return instance;
    }
    const emulatorManager = await this.avdManager.startEmulator(avdName, port);
    const newInstance = new EmulatorWebviewManager(this, emulatorManager);
    await newInstance.init(); // Wait for panel and WS start
    this.instances.set(avdName, newInstance);
    return newInstance;
  }

  dispose() {
    for (const instance of this.instances.values()) {
      instance.dispose();
    }
    this.instances.clear();
  }
}

class EmulatorWebviewManager {
  wsHelper: WebSocketHelper | undefined;

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
  ) {}

  async init() {
    this.panel = await this.createPanel();

    this.wsHelper = new WebSocketHelper();
    this.wsHelper.onMessage = (payload: WebviewToExtensionPayload) => {
      switch (payload.type) {
        case 'touch':
          this.emulatorManager.sendTouch(payload);
          break;
        case 'key':
          this.emulatorManager.sendKey(payload);
          break;
        case 'multiTouch':
          this.emulatorManager.sendMultiTouch(payload);
          break;
        case 'resize':
          this.resize(payload.width, payload.height);
          break;
      }
    };
    const wsPort = await this.wsHelper.start();

    await this.postMessage({
      type: 'readyForStreaming',
      port: wsPort,
    });
  }

  postMessage(payload: ExtensionToWebviewPayload) {
    return this.panel.webview.postMessage(payload);
  }

  frameStream: ClientReadableStream<Image> | undefined;

  private currentWidth = 360;
  private currentHeight = 720;

  async streamFrames() {
    if (this.frameStream) {
      this.frameStream.cancel();
      this.frameStream.destroy();
      this.frameStream = undefined;
    }

    this.frameStream = this.emulatorManager.streamScreenshot({
      width: this.currentWidth,
      height: this.currentHeight,
      format: ImageFormat_ImgFormat.PNG,
    });

    let displayConfigs: DisplayConfigurations;

    this.frameStream.on('data', async (frame: Image) => {
      if (!frame || !frame.image) return;

      try {
        if (!displayConfigs) {
          displayConfigs = await this.emulatorManager.getDisplayConfigs();
        }

        const displayConfig = displayConfigs.displays.find(
          (e) => e.display === frame.format?.display,
        );

        if (displayConfig) {
          this.wsHelper?.putFrame(
            frame.image,
            {
              width: frame.format!.width,
              height: frame.format!.height,
            },
            displayConfig,
          );
        }
      } catch (err) {
        console.error('Error in frame streaming:', err);
      }
    });
  }

  async resize(width: number, height: number) {
    if (this.currentWidth === width && this.currentHeight === height) return;
    this.currentWidth = width;
    this.currentHeight = height;
    await this.streamFrames();
  }

  dispose() {
    this.panel?.dispose();
    this.emulatorManager.dispose();
    this.wsHelper?.close();
  }

  private async createPanel(): Promise<WebviewPanel> {
    const webViewDirUri = this.webviewManager.webViewDirUri;
    const panel = window.createWebviewPanel(
      'embeddedAvd',
      this.emulatorManager.avdName,
      ViewColumn.Two,
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
          case 'listEmulators': {
            const emulators =
              await this.webviewManager.avdManager.getAvailableEmulators();
            await this.postMessage({
              type: 'listEmulatorsResponse',
              emulators: emulators,
            });
            return;
          }
          case 'touch':
            return this.emulatorManager.sendTouch(payload);
          case 'key':
            return this.emulatorManager.sendKey(payload);
          case 'multiTouch':
            return this.emulatorManager.sendMultiTouch(payload);
          case 'startEmulator':
            return this.webviewManager.startEmulatorWebview(payload.name, 8554);
          case 'resize':
            return this.resize(payload.width, payload.height);
          case 'requestWebRTCConnection':
            // Deprecated, but keeping for now
            return;
        }
        return;
      },
    );

    panel.onDidDispose(() => {
      this.emulatorManager.dispose();
      this.frameStream?.cancel();
      this.frameStream?.destroy();
      this.wsHelper?.close();
      this.webviewManager.instances.delete(this.emulatorManager.avdName);
      window.showInformationMessage(
        `Emulator ${this.emulatorManager.avdName} stopped`,
      );
    });

    this.streamFrames();

    return panel;
  }
}

export default WebviewManager;
