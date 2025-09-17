import type * as SharedPayloads from '../src/interfaces/payload';

declare global {
  type WebviewToExtensionPayload = SharedPayloads.WebviewToExtensionPayload;
  type MultiTouchPayload = SharedPayloads.MultiTouchPayload;
  type KeyPressPayload = SharedPayloads.KeyPressPayload;

  type ExtensionToWebviewPayload = SharedPayloads.ExtensionToWebviewPayload;
  type FrameUpdatePayload = SharedPayloads.FrameUpdatePayload;

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
    // You need to change `Worker`, if you specified a different value for the `workerType` option
    class WebpackWorker extends Worker {
      constructor();
    }

    // Uncomment this if you set the `esModule` option to `false`
    // export = WebpackWorker;
    export default WebpackWorker;
  }
}
