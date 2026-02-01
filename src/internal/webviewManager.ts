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
import WebRTCHelper from './helpers/webrtc-helper';

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
  webrtcHelper: WebRTCHelper | undefined;

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

  private async setupWebRTC() {
    return new WebRTCHelper(this.postMessage.bind(this));
  }

  private currentWidth = 360;
  private currentHeight = 720;

  async streamFrames() {
    if (this.frameStream) {
      this.frameStream.cancel();
      this.frameStream.destroy();
      this.frameStream = undefined;
    }

    let isProcessing = false;

    this.frameStream = this.emulatorManager.streamScreenshot({
      width: this.currentWidth,
      height: this.currentHeight,
      // Using RGBA8888 as wrtc.nonstandard.RTCVideoSource expects RGBA format
      format: ImageFormat_ImgFormat.RGBA8888,
    });

    let displayConfigs: DisplayConfigurations;

    this.frameStream.on('data', async (frame: Image) => {
      if (isProcessing) return;
      if (!frame || !frame.image) return;

      try {
        isProcessing = true;

        if (!displayConfigs) {
          displayConfigs = await this.emulatorManager.getDisplayConfigs();
        }

        const displayConfig = displayConfigs.displays.find(
          (e) => e.display === frame.format?.display,
        );
        if (!displayConfig) {
          console.warn(
            'No display config found for display:',
            frame.format?.display,
          );
          return;
        }

        if (!this.webrtcHelper) {
          this.webrtcHelper = await this.setupWebRTC();
        }
        this.webrtcHelper?.putFrame(
          frame.image,
          {
            width: frame.format!.width,
            height: frame.format!.height,
          },
          displayConfig,
        );
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

  async resize(width: number, height: number) {
    if (this.currentWidth === width && this.currentHeight === height) return;
    this.currentWidth = width;
    this.currentHeight = height;
    await this.streamFrames();
  }

  dispose() {
    this.panel?.dispose();
    this.emulatorManager.dispose();
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
            // TODO: Randomize gRPC port in case of multiple emulators
            return this.webviewManager.startEmulatorWebview(payload.name, 8554);
          case 'webrtcOffer':
          case 'webrtcIceCandidate':
          case 'webrtcAnswer':
          case 'requestWebRTCConnection':
            if (!this.webrtcHelper) {
              throw new Error('WebRTC not initialized yet');
            }
            return this.webrtcHelper!.handleWebRTCMessage(payload);
          case 'resize':
            return this.resize(payload.width, payload.height);
        }
      },
    );

    panel.onDidDispose(() => {
      this.emulatorManager.dispose();
      this.frameStream?.cancel();
      this.frameStream?.destroy();
      this.webrtcHelper?.close();
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
