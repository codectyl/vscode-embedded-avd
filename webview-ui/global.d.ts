import { type IncomingPayloadFromWebview } from '../src/interfaces/payload';

import type * as SharedPayloads from '../src/interfaces/payload';

declare global {
  type IncomingPayloadFromWebview = SharedPayloads.IncomingPayloadFromWebview;
  type OutgoingPayloadToWebview = SharedPayloads.OutgoingPayloadToWebview;
  type MultiTouchPayload = SharedPayloads.MultiTouchPayload;
  type KeyPressPayload = SharedPayloads.KeyPressPayload;

  function acquireVsCodeApi(): {
    postMessage: (message: IncomingPayloadFromWebview) => void;
    setState: (state: any) => void;
    getState: () => any;
  };
}
