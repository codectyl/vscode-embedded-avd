import { createEffect, onMount } from 'solid-js';
import { WorkerControllerType } from '../controllers/worker';

export default function EmulatorCanvas({
  controller,
}: {
  controller: WorkerControllerType;
}) {
  const { frame } = controller;

  let canvasRef: HTMLCanvasElement | undefined;

  let isDrawing = false;
  const drawFrame = async (
    canvasRef: HTMLCanvasElement,
    frame: FrameUpdatePayload,
  ) => {
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const bufferArray = frame.data as unknown as {
      type: 'Buffer';
      data: number[];
    }; // data is serialized when sent via postMessage
    const buff = new Uint8Array(bufferArray.data);
    const blob = new Blob([buff], {
      type: frame.mimetype,
    });

    const bitmap = await createImageBitmap(blob);
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

    // Compute scaling to maintain aspect ratio
    const scale = Math.min(
      canvasRef.width / frame.size.width,
      canvasRef.height / frame.size.height,
    );

    const xOffset = (canvasRef.width - frame.size.width * scale) / 2;
    const yOffset = (canvasRef.height - frame.size.height * scale) / 2;

    ctx.drawImage(
      bitmap,
      0,
      0,
      frame.size.width,
      frame.size.height,
      xOffset,
      yOffset,
      frame.size.width * scale,
      frame.size.height * scale,
    );
  };

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
    return frameData.actualFrameSize;
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

    canvas.focus();
  });

  // Re-draw whenever the frame changes
  createEffect(() => {
    const frameData = frame();
    if (!frameData || !canvasRef) return;
    try {
      if (isDrawing) return;
      isDrawing = true;
      drawFrame(canvasRef, frameData);
    } finally {
      isDrawing = false;
    }
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
