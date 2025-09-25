import { onCleanup, onMount } from 'solid-js';
import { Manager } from '../controllers/manager';
import vscode from '../internal/vscode';
import CanvasListener from '../internal/helpers/canvas-listeners';

type PropType = {
  controller: Manager;
};

export default function EmulatorWebRTCStream({ controller }: PropType) {
  let videoRef: HTMLVideoElement | undefined;

  const remoteStream: MediaStream = new MediaStream();

  let canvasListener: CanvasListener | undefined;

  onMount(() => {
    if (!videoRef) {
      console.error('Video element not found');
      return;
    }
    controller.peerConnection.ontrack = (event) => {
      if (event.track.kind !== 'video') return;
      if (event.track && !videoRef.srcObject) {
        remoteStream.addTrack(event.track);
        videoRef.srcObject = remoteStream;
        canvasListener = new CanvasListener(controller, videoRef);
        canvasListener.setupListeners();
      }
    };
    // Ready to establish WebRTC Connection
    vscode.postMessage({ type: 'requestWebRTCConnection' });
  });

  onCleanup(() => {
    controller.peerConnection.ontrack = null;
    canvasListener?.stopListeners();
  });

  return (
    <>
      <video
        ref={videoRef}
        autoplay
        playsinline
        muted
        class="max-w-full max-h-full w-auto h-auto object-contain"
        // height={getFrameSize().height}
        // width={getFrameSize().width}
      ></video>
    </>
  );
}
