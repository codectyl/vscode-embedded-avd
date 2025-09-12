import { type IncomingPayloadFromWebview } from '../src/interfaces/payload';

declare function acquireVsCodeApi(): {
  postMessage: (message: IncomingPayloadFromWebview) => void;
  setState: (state: any) => void;
  getState: () => any;
};
