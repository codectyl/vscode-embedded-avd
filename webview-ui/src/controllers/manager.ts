import { createSignal, onCleanup, onMount } from 'solid-js';
import type {
  WebRTCAnswerMessage,
  WebRTCCandidateMessage,
  WebRTCOfferMessage,
} from '../../../src/interfaces/payload';
import { Completer } from '../internal/helpers/completer';
import vscode from '../internal/vscode';

export type Manager = ReturnType<typeof useManager>;

export const useManager = () => {
  const [emulators, setEmulators] = createSignal<string[]>([]);
  const [streamingPort, setStreamingPort] = createSignal<number | undefined>();

  const peerConnection = new RTCPeerConnection();

  const webRTCReady: Completer<boolean> = new Completer();

  peerConnection.onicecandidate = (event) => {
    if (!event.candidate) return;
    vscode.postMessage({
      type: 'webrtcIceCandidate',
      candidate: (event.candidate?.toJSON() ??
        event.candidate) as unknown as Record<string, unknown>,
    });
  };

  // Not being used as it did not work when client established the connection first
  const sendWebRTCOffer = async () => {
    const pc = peerConnection;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    vscode.postMessage({
      type: 'webrtcOffer',
      sdp: pc.localDescription?.toJSON() as unknown as Record<string, unknown>,
    });
  };

  const acceptOffer = async (data: WebRTCOfferMessage) => {
    await peerConnection.setRemoteDescription(
      // @ts-ignore
      new RTCSessionDescription(data.sdp),
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    vscode.postMessage({
      type: 'webrtcAnswer',
      sdp: answer as unknown as Record<string, unknown>,
    });
  };

  const handleMessage = async (
    message: MessageEvent<ExtensionToWebviewPayload>,
  ) => {
    const data = message.data;
    switch (data.type) {
      case 'listEmulatorsResponse':
        setEmulators(data.emulators);
        break;
      case 'readyForWebRTC':
        webRTCReady.complete(true);
        break;
      case 'readyForStreaming':
        setStreamingPort(data.port);
        connectWebSocket(data.port);
        break;
      case 'requestForWebRTC':
        sendWebRTCOffer();
        break;
      case 'webrtcOffer':
        await acceptOffer(data);
        break;
      case 'webrtcAnswer':
        await acceptAnswer(data);
        break;
      case 'webrtcIceCandidate':
        await handleIceCandidate(data);
        break;
    }

    async function handleIceCandidate(message: WebRTCCandidateMessage) {
      if (!message.candidate) return;
      try {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(message.candidate),
        );
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    }
  };

  async function acceptAnswer(data: WebRTCAnswerMessage) {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription({
        // @ts-ignore
        type: data.sdp.type,
        // @ts-ignore
        sdp: data.sdp.sdp,
      }),
    );
  }

  const refreshAvailableEmulators = (): void => {
    vscode.postMessage({ type: 'listEmulators' });
  };

  const startEmulator = (name: string): Promise<boolean> => {
    vscode.postMessage({ type: 'startEmulator', name });
    return Promise.resolve(true);
  };

  let ws: WebSocket | undefined;
  type FrameCallback = (data: ArrayBuffer | string) => void;
  const frameCallbacks = new Set<FrameCallback>();

  const connectWebSocket = (port: number) => {
    if (ws) ws.close();
    const host = '127.0.0.1';
    ws = new WebSocket(`ws://${host}:${port}`);
    ws.binaryType = 'arraybuffer';

    ws.onmessage = (event) => {
      for (const cb of frameCallbacks) {
        cb(event.data);
      }
    };

    ws.onclose = () => console.log('[Manager] WS Closed');
    ws.onerror = (e) => console.error('[Manager] WS Error', e);
  };

  const onFrame = (cb: FrameCallback) => {
    frameCallbacks.add(cb);
    onCleanup(() => frameCallbacks.delete(cb));
  };

  const goHome = () =>
    sendEvent({ type: 'key', key: 'Home', keyCode: 3, eventType: 'keydown' });
  const goBack = () =>
    sendEvent({ type: 'key', key: 'Back', keyCode: 4, eventType: 'keydown' });
  const showRecents = () =>
    sendEvent({
      type: 'key',
      key: 'AppSwitch',
      keyCode: 187,
      eventType: 'keydown',
    });
  const togglePower = () =>
    sendEvent({ type: 'key', key: 'Power', keyCode: 26, eventType: 'keydown' });
  const volumeUp = () =>
    sendEvent({
      type: 'key',
      key: 'VolumeUp',
      keyCode: 24,
      eventType: 'keydown',
    });
  const volumeDown = () =>
    sendEvent({
      type: 'key',
      key: 'VolumeDown',
      keyCode: 25,
      eventType: 'keydown',
    });

  const sendEvent = (event: WebviewToExtensionPayload) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    } else {
      vscode.postMessage(event);
    }
  };

  onMount(() => window.addEventListener('message', handleMessage));

  onCleanup(() => {
    peerConnection.close();
    ws?.close();
    window.removeEventListener('message', handleMessage);
  });

  return {
    emulators,
    startEmulator,
    refreshAvailableEmulators,
    peerConnection,
    webRTCReady,
    sendEvent,
    goHome,
    goBack,
    showRecents,
    togglePower,
    volumeUp,
    volumeDown,
    streamingPort,
    onFrame,
    resize: (width: number, height: number) =>
      sendEvent({ type: 'resize', width, height }),
  };
};
