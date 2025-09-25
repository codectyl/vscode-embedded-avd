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
  | KeyPressPayload
  | WebRTCAnswerMessage
  | WebRTCOfferMessage
  | WebRTCCandidateMessage
  | { type: 'requestWebRTCConnection' };

export interface ListEmulatorsResponsePayload {
  type: 'listEmulatorsResponse';
  emulators: string[];
}

export type ExtensionToWebviewPayload =
  | ListEmulatorsResponsePayload
  | WebRTCAnswerMessage
  | WebRTCOfferMessage
  | WebRTCCandidateMessage
  | { type: 'readyForWebRTC' };

export type WebRTCMessage =
  | WebRTCAnswerMessage
  | WebRTCOfferMessage
  | WebRTCCandidateMessage
  | { type: 'requestWebRTCConnection' };

export interface WebRTCOfferMessage {
  type: 'webrtcOffer';
  sdp: Record<string, unknown>;
}

export interface WebRTCAnswerMessage {
  type: 'webrtcAnswer';
  sdp: Record<string, unknown>;
}

export interface WebRTCCandidateMessage {
  type: 'webrtcIceCandidate';
  candidate: Record<string, unknown>;
}
