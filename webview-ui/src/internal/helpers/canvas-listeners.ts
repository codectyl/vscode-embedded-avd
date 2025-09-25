import { Manager } from '../../controllers/manager';

class CanvasListener {
  isDown = false;

  constructor(
    public controller: Manager,
    public elRef: HTMLVideoElement,
  ) {}

  frameInfo: FrameInfoDataChannelPayload | undefined;

  updateFrameInfo = (data: FrameInfoDataChannelPayload) => {
    this.frameInfo = data;
  };

  getCanvasSize = () => {
    return {
      width: this.elRef.clientWidth,
      height: this.elRef.clientHeight,
    };
  };

  getDisplaySize = () => {
    if (!this.frameInfo) {
      throw new Error('Frame info not available');
    }
    return {
      width: this.frameInfo?.displayConfig.width ?? 0,
      height: this.frameInfo?.displayConfig.height ?? 0,
    };
  };

  private pointerDownHandler = (e: PointerEvent) => {
    const canvasSize = this.getCanvasSize();
    const displaySize = this.getDisplaySize();

    const rect = this.elRef.getBoundingClientRect();
    const touches: MultiTouchPayload['touches'] = [
      {
        id: e.pointerId,
        x: (e.clientX - rect.left) * (canvasSize.width / rect.width),
        y: (e.clientY - rect.top) * (canvasSize.height / rect.height),
        type: 'down',
      },
    ];
    this.elRef.setPointerCapture(e.pointerId);
    this.isDown = true;

    const mappedTouches = touches.map((t) => ({
      ...t,
      x: Math.round((t.x / canvasSize.width) * displaySize.width),
      y: Math.round((t.y / canvasSize.height) * displaySize.height),
    }));

    this.controller.sendEvent({
      type: 'multiTouch',
      touches: mappedTouches,
    });
  };

  private pointerMoveHandler = (e: PointerEvent) => {
    if (!this.isDown) return;
    const rect = this.elRef.getBoundingClientRect();
    const canvasSize = this.getCanvasSize();
    const displaySize = this.getDisplaySize();

    const touches: MultiTouchPayload['touches'] = [
      {
        id: e.pointerId,
        x: (e.clientX - rect.left) * (canvasSize.width / rect.width),
        y: (e.clientY - rect.top) * (canvasSize.height / rect.height),
        type: 'down',
      },
    ];

    const mappedTouches = touches.map((t) => ({
      ...t,
      x: Math.round((t.x / canvasSize.width) * displaySize.width),
      y: Math.round((t.y / canvasSize.height) * displaySize.height),
    }));

    this.controller.sendEvent({
      type: 'multiTouch',
      touches: mappedTouches,
    });
  };

  private pointerUpHandler = (e: PointerEvent) => {
    const rect = this.elRef.getBoundingClientRect();

    const canvasSize = this.getCanvasSize();
    const displaySize = this.getDisplaySize();

    const touches: MultiTouchPayload['touches'] = [
      {
        id: e.pointerId,
        x: (e.clientX - rect.left) * (canvasSize.width / rect.width),
        y: (e.clientY - rect.top) * (canvasSize.height / rect.height),
        type: 'up',
      },
    ];
    this.isDown = false;
    this.elRef.releasePointerCapture(e.pointerId);

    const mappedTouches = touches.map((t) => ({
      ...t,
      x: Math.round((t.x / canvasSize.width) * displaySize.width),
      y: Math.round((t.y / canvasSize.height) * displaySize.height),
    }));

    this.controller.sendEvent({
      type: 'multiTouch',
      touches: mappedTouches,
    });
  };

  private keydownHandler = (e: KeyboardEvent) => {
    this.controller.sendEvent({
      type: 'key',
      key: e.key,
      keyCode: e.keyCode,
      eventType: 'keydown',
    });
  };

  setupListeners = () => {
    this.elRef.addEventListener('pointerdown', this.pointerDownHandler);
    this.elRef.addEventListener('pointermove', this.pointerMoveHandler);
    this.elRef.addEventListener('pointerup', this.pointerUpHandler);
    this.elRef.addEventListener('keydown', this.keydownHandler);
  };

  stopListeners = () => {
    this.elRef.removeEventListener('pointerdown', this.pointerDownHandler);
    this.elRef.removeEventListener('pointermove', this.pointerMoveHandler);
    this.elRef.removeEventListener('pointerup', this.pointerUpHandler);
    this.elRef.removeEventListener('keydown', this.keydownHandler);
  };
}

export default CanvasListener;
