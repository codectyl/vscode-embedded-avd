import { createSignal, onCleanup, onMount } from 'solid-js';
import vscode from '../internal/vscode';
import {
  WebRTCAnswerMessage,
  WebRTCOfferMessage,
  type WebRTCCandidateMessage,
} from '../../../src/interfaces/payload';

export type Manager = ReturnType<typeof useManager>;

export const useManager = () => {
  const [emulators, setEmulators] = createSignal<string[]>([]);

  const peerConnection = new RTCPeerConnection();

  peerConnection.onicecandidate = (event) => {
    if (!event.candidate) return;
    vscode.postMessage({
      type: 'webrtcIceCandidate',
      candidate: (event.candidate?.toJSON() ??
        event.candidate) as unknown as Record<string, unknown>,
    });
  };

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
      new RTCSessionDescription(data['sdp']),
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // Send the answer back to the server
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
        await sendWebRTCOffer();
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
        type: data.sdp['type'],
        // @ts-ignore
        sdp: data.sdp['sdp'],
      }),
    );
  }

  const refreshAvailableEmulators = (): void => {
    return vscode.postMessage({ type: 'listEmulators' });
  };

  const startEmulator = (name: string): Promise<boolean> => {
    vscode.postMessage({ type: 'startEmulator', name });
    return Promise.resolve(true);
  };

  const sendKeypressEvent = (event: KeyPressPayload) => {
    vscode.postMessage(event);
  };

  const sendTouchEvent = (
    event: MultiTouchPayload,
    { canvasSize, frameSize }: { canvasSize: Size; frameSize: Size },
  ) => {
    const mappedTouches = event.touches.map((t) => ({
      ...t,
      x: Math.round((t.x / canvasSize.width) * frameSize.width),
      y: Math.round((t.y / canvasSize.height) * frameSize.height),
    }));
    event.touches = mappedTouches;
    vscode.postMessage(event);
  };

  onMount(() => window.addEventListener('message', handleMessage));

  onCleanup(() => {
    peerConnection.close();
    window.removeEventListener('message', handleMessage);
  });

  return {
    emulators,
    startEmulator,
    refreshAvailableEmulators,
    sendKeypressEvent,
    sendTouchEvent,
    peerConnection,
  };
};
