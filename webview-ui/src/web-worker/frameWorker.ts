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

async function renderFrameToCanvas(
  frame: FrameUpdatePayload,
  canvasSize: { width: number; height: number },
) {
  const frameSize = frame.size;

  if (!offscreenCanvas) {
    console.error('OffscreenCanvas not initialized');
    return;
  }

  const ctx = offscreenCanvas.getContext('2d');
  offscreenCanvas.width = canvasSize.width;
  offscreenCanvas.height = canvasSize.height;

  if (!ctx) {
    console.error('Failed to get 2D context from OffscreenCanvas');
    return;
  }

  const scale = Math.min(
    canvasSize.width / frameSize.width,
    canvasSize.height / frameSize.height,
  );
  const xOffset = (canvasSize.width - frameSize.width * scale) / 2;
  const yOffset = (canvasSize.height - frameSize.height * scale) / 2;

  const bufferArray = frame.data as unknown as {
    type: 'Buffer';
    data: number[];
  }; // data is serialized when sent via postMessage
  const buff = Uint8Array.from(bufferArray.data);
  const blob = new Blob([buff], {
    type: frame.mimetype,
  });

  // Decode image
  const bitmap = await createImageBitmap(blob);

  // Clear and scale
  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  ctx.drawImage(
    bitmap,
    0,
    0,
    frameSize.width,
    frameSize.height,
    xOffset,
    yOffset,
    frameSize.width * scale,
    frameSize.height * scale,
  );

  bitmap.close();
}

let isDrawing = false;

self.onmessage = async (
  event: MessageEvent<FrameOffscreenRenderMessage | OffscreenCanvasInitMessage>,
) => {
  if (event.data.type === 'offscreenCanvasInit') {
    const { canvas } = event.data;
    offscreenCanvas = canvas;
    return;
  }

  if (event.data.type === 'offscreenRender') {
    const { frame, canvasSize } = event.data;

    if (isDrawing) return;
    isDrawing = true;
    renderFrameToCanvas(frame, canvasSize).finally(() => {
      isDrawing = false;
    });
  }
  // Initialize OffscreenCanvas and VideoDecoder once (Revisit)
  /* 
  if (!offscreen) {
    offscreen = new OffscreenCanvas(width, height);
    ctx = offscreen.getContext('2d')!;
    decoder = new VideoDecoder({
      output: (frame: VideoFrame) => {
        ctx.drawImage(frame, 0, 0, width, height);
        const bitmap = offscreen.transferToImageBitmap();
        postMessage({ type: 'frame', bitmap }, [bitmap]);
        frame.close();
      },
      error: console.error,
    });
    decoder.configure({
      codec: 'vp8',
      hardwareAcceleration: 'prefer-hardware',
    });
  }

  // Feed compressed frame to decoder
  decoder.decode(
    new EncodedVideoChunk({
      type: 'key', // or "delta" depending on frame
      timestamp: Date.now(),
      data,
    }),
  ) 
    
  */
};
