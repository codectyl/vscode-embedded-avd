import { onCleanup, onMount } from 'solid-js';
import type { FrameInfoDataChannelPayload } from '../../../src/interfaces/payload';
import type { Manager } from '../controllers/manager';
import CanvasListener from '../internal/helpers/canvas-listeners';

type PropType = {
  controller: Manager;
};

export default function EmulatorWebRTCStream({ controller }: PropType) {
  let canvasRef: HTMLCanvasElement | undefined;
  let canvasListener: CanvasListener | undefined;
  let frameInfo: FrameInfoDataChannelPayload | undefined;

  onMount(() => {
    if (!canvasRef) return;

    // Resize observer for adaptive streaming
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            controller.resize(Math.round(width), Math.round(height));
          }, 300);
        }
      }
    });

    if (canvasRef.parentElement) {
      resizeObserver.observe(canvasRef.parentElement);
    }

    controller.onFrame(async (data) => {
      if (typeof data === 'string') {
        const parsed = JSON.parse(data);
        if (parsed.type === 'metadata') {
          frameInfo = parsed;
          if (canvasRef) {
            canvasRef.width = parsed.frameSize.width;
            canvasRef.height = parsed.frameSize.height;
            if (!canvasListener) {
              canvasListener = new CanvasListener(controller, canvasRef);
              canvasListener.setupListeners();
            }
            canvasListener.updateFrameInfo(parsed);
          }
        }
      } else if (data instanceof ArrayBuffer) {
        if (!canvasRef || !frameInfo) return;
        const ctx = canvasRef.getContext('2d');
        if (!ctx) return;

        try {
          const blob = new Blob([data], { type: 'image/png' });
          const bitmap = await createImageBitmap(blob);
          ctx.drawImage(
            bitmap,
            0,
            0,
            frameInfo.frameSize.width,
            frameInfo.frameSize.height,
          );
          bitmap.close();
        } catch (e) {
          console.error('[EmulatorStream] Rendering error:', e);
        }
      }
    });

    onCleanup(() => {
      resizeObserver.disconnect();
    });
  });

  let resizeTimeout: any;

  onCleanup(() => {
    canvasListener?.stopListeners();
  });

  return (
    <canvas
      ref={canvasRef}
      tabindex="0"
      class="max-w-full max-h-full w-auto h-auto object-contain cursor-crosshair outline-none"
      style={{
        'aspect-ratio': frameInfo
          ? `${frameInfo.frameSize.width} / ${frameInfo.frameSize.height}`
          : 'auto',
      }}
    />
  );
}
