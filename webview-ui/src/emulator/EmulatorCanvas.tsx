import { createEffect, onCleanup, onMount } from 'solid-js';
import { WorkerControllerType } from '../controllers/worker';

import {
  type OffscreenCanvasInitMessage,
  type FrameOffscreenRenderMessage,
} from '../web-worker/frameWorker';

import FrameWorker from 'worker-rspack-loader?inline=fallback!../web-worker/frameWorker';
import { arrayBuffer } from 'stream/consumers';

type PropType = {
  controller: WorkerControllerType;
};

export default function EmulatorCanvas({ controller }: PropType) {
  const { frame } = controller;

  let canvasRef: HTMLCanvasElement | undefined;

  const worker = new FrameWorker();

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

  let isDown = false;

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
    const frameData = frame();
    if (!frameData || !canvasRef) return;
    drawFrameOffscreen(canvasRef, frameData);
  });

  const drawFrameOffscreen = async (
    canvasRef: HTMLCanvasElement,
    frame: FrameUpdatePayload,
  ) => {
    requestAnimationFrame(() => {
      // VSCode serializes Uint8Array as { type: 'Buffer'; data: number[] }
      // So we need to convert it back to Uint8Array for the worker for zero-copy transfer
      // There should be a better way to do this
      const arrayBuffer = Uint8Array.from(
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
    <canvas
      ref={canvasRef}
      tabindex="0"
      class="max-w-full max-h-full w-auto h-auto object-contain"
      height={frame()?.size.height}
      width={frame()?.size.width}
    />
  );
}
