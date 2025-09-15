export interface MultiTouchPayload {
  type: 'multiTouch';
  touches: Array<{
    id: number;
    x: number;
    y: number;
    type: 'down' | 'up';
  }>;
}
export interface TouchPayload {
  type: 'touch';
  x: number;
  y: number;
}

export interface KeyPressPayload {
  type: 'key';
  key: 'AppSwitch' | 'GoBack' | 'GoHome' | 'Power' | string;
  keyCode: number;
  eventType: 'keydown' | 'keyup' | 'keypress';
}

export interface StartEmulatorPayload {
  type: 'startEmulator';
  name: string;
}

export interface ListEmulatorsPayload {
  type: 'listEmulators';
}

export type WebviewToExtensionPayload =
  | StartEmulatorPayload
  | ListEmulatorsPayload
  | MultiTouchPayload
  | TouchPayload
  | KeyPressPayload;

export interface FrameUpdatePayload {
  type: 'frame';
  data: Uint8Array<ArrayBufferLike>;
  mimetype: string;
  size: { width: number; height: number };
  actualDisplaySize: { width: number; height: number };
}

export interface ListEmulatorsResponsePayload {
  type: 'listEmulatorsResponse';
  emulators: string[];
}

export type ExtensionToWebviewPayload =
  | FrameUpdatePayload
  | ListEmulatorsResponsePayload;
