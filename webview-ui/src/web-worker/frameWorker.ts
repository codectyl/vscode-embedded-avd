import VideoRenderer from '../internal/videoRenderer';

export type FrameRenderToCanvasMessage = {
  type: 'renderCanvas';
  bitmap: ImageBitmap;
};

export type FrameOffscreenRenderMessage = {
  type: 'offscreenRender';
  frame: FrameUpdatePayload;
  canvasSize: { width: number; height: number };
};

export type OffscreenCanvasInitMessage = {
  type: 'offscreenCanvasInit';
  canvas: OffscreenCanvas;
};

let offscreenCanvas: OffscreenCanvas | null = null;

let renderer: VideoRenderer | null = null;
self.onmessage = async (
  event: MessageEvent<FrameOffscreenRenderMessage | OffscreenCanvasInitMessage>,
) => {
  if (event.data.type === 'offscreenCanvasInit') {
    const { canvas } = event.data;
    offscreenCanvas = canvas;
    renderer = new VideoRenderer({ offscreenCanvas: canvas });
    return;
  }

  if (event.data.type === 'offscreenRender') {
    const { frame, canvasSize } = event.data;

    await renderer?.encodeAndRenderImageBuffer(
      // Should not matter with the type assertion here
      frame.data as unknown as Uint8Array<ArrayBuffer>,
      frame.mimetype,
      canvasSize,
    );
  }
};

self.onabort = () => {
  renderer?.close();
};
self.onclose = () => {
  renderer?.close();
};
self.oncancel = (_: Event) => {
  renderer?.close();
  console.log('Worker cancelled');
};
