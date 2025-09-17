class VideoRenderer {
  encoder!: VideoEncoder;
  decoder!: VideoDecoder;

  offscreenCanvas: OffscreenCanvas;

  constructor({ offscreenCanvas }: { offscreenCanvas: OffscreenCanvas }) {
    this.offscreenCanvas = offscreenCanvas;

    const canvasSize = {
      width: offscreenCanvas.width,
      height: offscreenCanvas.height,
    };

    // --DECODER SETUP--
    this.decoder = new VideoDecoder({
      output: (frame: VideoFrame) => {
        const ctx = this.offscreenCanvas?.getContext('2d');
        if (!this.offscreenCanvas || !ctx) {
          frame.close();
          return;
        }
        ctx.drawImage(frame, 0, 0, frame.displayWidth, frame.displayHeight);
        frame.close();
      },
      error: (e) => console.error('Decoder error:', e),
    });

    // --ENCODER SETUP--
    this.encoder = new VideoEncoder({
      output: (chunk) => {
        this.decoder.decode(chunk);
      },
      error: (e) => console.error('Encoder error:', e),
    });

    this.configure(canvasSize.width, canvasSize.height);
    console.log('VideoRenderer initialized');
  }
  keyFrame = true;
  isDrawing = false;

  async configure(width: number, height: number) {
    if (
      width === this.offscreenCanvas.width &&
      height === this.offscreenCanvas.height
    )
      return;

    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.decoder.configure({
      codec: 'vp8',
      codedWidth: width,
      codedHeight: height,
    });
    this.encoder.configure({
      codec: 'vp8',
      width,
      height,
      bitrate: 500_000,
      framerate: 30,
    });
    await this.encoder.flush();
    await this.decoder.flush();
    this.keyFrame = true;
  }

  async encodeAndRenderImageBuffer(
    buffer: { type: 'Buffer'; data: number[] },
    mimeType: string = 'image/png',
    canvasSize: { width: number; height: number },
  ) {
    if (this.isDrawing) return;
    this.isDrawing = true;

    if (
      canvasSize.height !== this.offscreenCanvas.height ||
      canvasSize.width !== this.offscreenCanvas.width
    ) {
      await this.configure(canvasSize.width, canvasSize.height);
    }

    const bytes = Uint8Array.from(buffer.data);
    const blob = new Blob([bytes], { type: mimeType });

    let bitmap: ImageBitmap | null = null;
    let frame: VideoFrame | null = null;

    try {
      bitmap = await createImageBitmap(blob);
      frame = new VideoFrame(bitmap, { timestamp: Date.now() });
      this.encoder.encode(frame, { keyFrame: this.keyFrame });
      this.keyFrame = false;
    } finally {
      frame?.close();
      bitmap?.close();
      this.isDrawing = false;
    }
  }

  close() {
    this.encoder.close();
    this.decoder.close();
  }
}

export default VideoRenderer;
