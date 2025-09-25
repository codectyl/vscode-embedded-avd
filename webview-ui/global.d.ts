import type * as SharedPayloads from '../src/interfaces/payload';

declare global {
  type WebviewToExtensionPayload = SharedPayloads.WebviewToExtensionPayload;
  type MultiTouchPayload = SharedPayloads.MultiTouchPayload;
  type KeyPressPayload = SharedPayloads.KeyPressPayload;

  type ExtensionToWebviewPayload = SharedPayloads.ExtensionToWebviewPayload;

  type FrameInfoDataChannelPayload = SharedPayloads.FrameInfoDataChannelPayload;

  type Size = { width: number; height: number };

  function acquireVsCodeApi(): {
    postMessage: (message: WebviewToExtensionPayload) => void;
    setState: (state: any) => void;
    getState: () => any;
  };

  declare module '*?raw' {
    const content: string;
    export default content;
  }

  declare module 'worker-rspack-loader*' {
    class WebpackWorker extends Worker {
      constructor();
    }

    export default WebpackWorker;
  }
}
