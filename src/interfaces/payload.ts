export interface MultiTouchPayload {
  type: 'multiTouch';
  touches: Array<{
    id: number;
    x: number;
    y: number;
    pressure: number;
    type: string;
  }>;
}
export interface TouchPayload {
  type: 'touch';
  x: number;
  y: number;
}

export interface KeyPressPayload {
  type: 'key';
  key: string;
  code: string;
  keyCode: number;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

export type IncomingPayloadFromWebview =
  | MultiTouchPayload
  | TouchPayload
  | KeyPressPayload;

export interface FrameUpdatePayload {
  type: 'frame';
  data: string; // base64 encoded image data
  mimetype: string;
  size: { width: number; height: number };
}

export type OutgoingPayloadToWebview = FrameUpdatePayload;
