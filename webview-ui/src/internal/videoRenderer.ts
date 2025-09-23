import {
  Input,
  ReadableStreamSource,
  ALL_FORMATS,
  VideoSampleSink,
} from 'mediabunny';

class VideoRenderer {
  offscreenCanvas: OffscreenCanvas;

  stream: ReadableStream<Uint8Array>;
  controller: ReadableStreamDefaultController<Uint8Array> | undefined;

  input: Input<ReadableStreamSource>;

  isReady = false;

  constructor({ offscreenCanvas }: { offscreenCanvas: OffscreenCanvas }) {
    this.offscreenCanvas = offscreenCanvas;
    this.stream = this.setupStream();
    this.input = new Input({
      source: new ReadableStreamSource(this.stream),
      formats: ALL_FORMATS,
    });

    this.listenToStream();
  }

  async putFrame(frameInfo: FrameUpdatePayload, canvasSize: Size) {
    if (!this.controller) {
      console.error('Stream Controller not set up yet');
      return;
    }

    if (
      canvasSize.height !== this.offscreenCanvas.height ||
      canvasSize.width !== this.offscreenCanvas.width
    ) {
      this.offscreenCanvas.width = canvasSize.width;
      this.offscreenCanvas.height = canvasSize.height;
    }
    this.controller.enqueue(frameInfo.data);
  }

  private setupStream() {
    const stream = new ReadableStream({
      start: (ctrl) => {
        this.controller = ctrl;
      },
    });

    return stream;
  }

  async listenToStream() {
    const input = this.input;

    try {
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) throw new Error('No video track found');
      const sink = new VideoSampleSink(videoTrack);

      const ctx = this.offscreenCanvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get 2D context');

      // const start = performance.now();
      for await (const sample of sink.samples()) {
        // const elapsed = performance.now() - start;
        // const delay = sample.timestamp / 1000 - elapsed;
        // if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        sample.draw(
          ctx,
          0,
          0,
          this.offscreenCanvas.width,
          this.offscreenCanvas.height,
        );
        sample.close();
      }
    } catch (e) {
      console.error('Error in listening to stream', e);
      await new Promise((r) => setTimeout(r, 5000));
      this.listenToStream(); // Retry listening to stream
      return;
    }
  }

  dispose() {
    this.input.dispose();
    this.controller?.close();
    this.stream.cancel();
  }
}

export default VideoRenderer;
