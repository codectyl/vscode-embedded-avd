import { createEffect, onCleanup, onMount } from 'solid-js';
import { WorkerControllerType } from '../controllers/worker';

import {
  type OffscreenCanvasInitMessage,
  type FrameOffscreenRenderMessage,
} from '../web-worker/frameWorker';

import FrameWorker from 'worker-rspack-loader?inline=fallback!../web-worker/frameWorker';

type PropType = {
  controller: WorkerControllerType;
};

export default function EmulatorCanvas({ controller }: PropType) {
  const { frame } = controller;

  let canvasRef: HTMLCanvasElement | undefined;
  let videoRef: HTMLVideoElement | undefined;

  const worker = new FrameWorker();

  const mediaSource = new MediaSource();
  let sourceBuffer: SourceBuffer | undefined;

  const getCanvasSize = () => {
    if (!canvasRef) return { width: 0, height: 0 };
    return {
      width: canvasRef.width,
      height: canvasRef.height,
    };
  };

  const getFrameSize = () => {
    const frameData = frame();
    if (!frameData) return { width: 0, height: 0 };
    return frameData.actualDisplaySize;
  };

  let queue: BufferSource[] = [];
  function tryAppendNextChunk() {
    if (!sourceBuffer || sourceBuffer.updating || queue.length === 0) return;

    console.log('Appending next chunk, queue length:', queue.length);
    const chunk = queue.shift();
    if (!chunk) return;
    try {
      console.log(mediaSource.sourceBuffers);
      sourceBuffer.appendBuffer(chunk);
    } catch (e) {
      console.error('appendBuffer failed:', e);
    }
  }

  let isDown = false;

  onMount(() => {
    if (!videoRef) return;
    videoRef.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener('sourceopen', () => {
      sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp9"');
      console.log({ added: sourceBuffer });
      sourceBuffer?.addEventListener('update', () => {
        console.log('updateend');
      });

      console.log(mediaSource.sourceBuffers.length);

      sourceBuffer?.addEventListener('updateend', tryAppendNextChunk);
      sourceBuffer?.addEventListener('error', (e) => console.error(e));
      sourceBuffer?.addEventListener('abort', (e) => console.error(e));
    });

    mediaSource.addEventListener('error', (e) => {
      console.error('MediaSource error:', e);
    });

    mediaSource.addEventListener('sourceclose', () => {
      console.log(mediaSource.sourceBuffers.length);

      console.log('MediaSource closed — cannot append anymore');
    });
  });

  onMount(() => {
    if (!canvasRef) return;

    const canvas = canvasRef;

    // Pointer events for multi-touch
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const touches: MultiTouchPayload['touches'] = [
        {
          id: e.pointerId,
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top) * (canvas.height / rect.height),
          type: 'down',
        },
      ];
      canvas.setPointerCapture(e.pointerId);
      isDown = true;
      controller.sendTouchEvent(
        {
          type: 'multiTouch',
          touches,
        },
        { canvasSize: getCanvasSize(), frameSize: getFrameSize() },
      );
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      const rect = canvas.getBoundingClientRect();
      const touches: MultiTouchPayload['touches'] = [
        {
          id: e.pointerId,
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top) * (canvas.height / rect.height),
          type: 'down',
        },
      ];
      controller.sendTouchEvent(
        { type: 'multiTouch', touches },
        { canvasSize: getCanvasSize(), frameSize: getFrameSize() },
      );
    });

    canvas.addEventListener('pointerup', (e) => {
      const rect = canvas.getBoundingClientRect();

      const touches: MultiTouchPayload['touches'] = [
        {
          id: e.pointerId,
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top) * (canvas.height / rect.height),
          type: 'up',
        },
      ];
      isDown = false;
      canvas.releasePointerCapture(e.pointerId);
      controller.sendTouchEvent(
        { type: 'multiTouch', touches },
        { canvasSize: getCanvasSize(), frameSize: getFrameSize() },
      );
    });

    // Keyboard support
    canvas.addEventListener('keydown', (e) => {
      controller.sendKeypressEvent({
        type: 'key',
        key: e.key,
        keyCode: e.keyCode,
        eventType: 'keydown',
      });
    });

    const offscreenCanvas = canvas.transferControlToOffscreen();
    worker.postMessage(
      {
        type: 'offscreenCanvasInit',
        canvas: offscreenCanvas,
      } satisfies OffscreenCanvasInitMessage,
      [offscreenCanvas],
    );
  });

  // Re-draw whenever the frame changes
  createEffect(() => {
    const frameInfo = frame();
    if (!frameInfo || !canvasRef) return;

    // const arrayBuffer = new Uint8Array(
    //   (frameInfo.data as unknown as { data: number[]; type: 'Buffer' }).data,
    // );
    // frameInfo.data = arrayBuffer;

    // queue.push(arrayBuffer);
    // tryAppendNextChunk();
    drawFrameOffscreen(canvasRef, frameInfo);
  });

  const drawFrameOffscreen = async (
    canvasRef: HTMLCanvasElement,
    frame: FrameUpdatePayload,
  ) => {
    requestAnimationFrame(() => {
      // VSCode serializes Uint8Array as { type: 'Buffer'; data: number[] }
      // So we need to convert it back to Uint8Array for the worker for zero-copy transfer
      // There should be a better way to do this
      const arrayBuffer = new Uint8Array(
        (frame.data as unknown as { data: number[]; type: 'Buffer' }).data,
      );
      frame.data = arrayBuffer;
      worker.postMessage(
        {
          type: 'offscreenRender',
          frame: frame,
          canvasSize: { width: canvasRef.width, height: canvasRef.height },
        } satisfies FrameOffscreenRenderMessage,
        [frame.data.buffer],
      );
    });
  };

  onCleanup(() => {
    worker.terminate();
  });

  return (
    <>
      <video ref={videoRef}></video>
      <canvas
        ref={canvasRef}
        tabindex="0"
        class="max-w-full max-h-full w-auto h-auto object-contain"
        height={frame()?.size.height}
        width={frame()?.size.width}
      />
    </>
  );
}
