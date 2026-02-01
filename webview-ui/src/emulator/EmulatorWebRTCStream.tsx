import { onCleanup, onMount } from 'solid-js';
import type { Manager } from '../controllers/manager';
import CanvasListener from '../internal/helpers/canvas-listeners';
import vscode from '../internal/vscode';

type PropType = {
  controller: Manager;
};

export default function EmulatorWebRTCStream({ controller }: PropType) {
  let videoRef: HTMLVideoElement | undefined;

  const remoteStream: MediaStream = new MediaStream();

  let canvasListener: CanvasListener | undefined;

  let frameInfo: FrameInfoDataChannelPayload | undefined;

  let frameInfoDataChannel: RTCDataChannel | undefined;

  onMount(async () => {
    if (!videoRef) {
      console.error('Video element not found');
      return;
    }
    // Comment this code if you are hot reloading
    const isReady = await controller.webRTCReady.promise;
    if (!isReady) {
      console.error('WebRTC not initialized from the extension side');
      return;
    }
    //

    controller.peerConnection.ontrack = (event) => {
      if (event.track.kind !== 'video') return;
      if (event.track && !videoRef.srcObject) {
        remoteStream.addTrack(event.track);
        videoRef.srcObject = remoteStream;
        canvasListener = new CanvasListener(controller, videoRef);
        canvasListener.setupListeners();
      }
    };

    controller.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      if (channel.label !== 'frameInfo') return;
      frameInfoDataChannel = channel;
      frameInfoDataChannel.onmessage = (msgEvent) => {
        const data = JSON.parse(msgEvent.data) as FrameInfoDataChannelPayload;
        canvasListener?.updateFrameInfo(data);
        frameInfo = data;
      };
    };

    // Resize observer for adaptive streaming
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          // Debounce resize events
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            controller.resize(Math.round(width), Math.round(height));
          }, 300);
        }
      }
    });

    if (videoRef.parentElement) {
      resizeObserver.observe(videoRef.parentElement);
    }

    onCleanup(() => resizeObserver.disconnect());

    // Ready to establish WebRTC Connection
    vscode.postMessage({ type: 'requestWebRTCConnection' });
  });

  let resizeTimeout: any;

  onCleanup(() => {
    controller.peerConnection.ontrack = null;
    controller.peerConnection.ondatachannel = null;
    canvasListener?.stopListeners();
  });

  return (
    <>
      <video
        ref={videoRef}
        autoplay
        tabindex="0"
        playsinline
        muted
        class="max-w-full max-h-full w-auto h-auto object-contain"
        height={frameInfo?.frameSize.height}
        width={frameInfo?.frameSize.width}
      />
    </>
  );
}
