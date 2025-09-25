import { Manager } from '../../controllers/manager';

class CanvasListener {
  isDown = false;

  constructor(
    public controller: Manager,
    public elRef: HTMLVideoElement,
  ) {}

  getCanvasSize = () => {
    return {
      width: this.elRef.clientWidth,
      height: this.elRef.clientHeight,
    };
  };

  getFrameSize = () => {
    // TODO: Fix
    return {
      width: this.elRef.clientWidth,
      height: this.elRef.clientHeight,
    };
  };

  private pointerDownHandler = (e: PointerEvent) => {
    const rect = this.elRef.getBoundingClientRect();
    const touches: MultiTouchPayload['touches'] = [
      {
        id: e.pointerId,
        x: (e.clientX - rect.left) * (this.elRef.width / rect.width),
        y: (e.clientY - rect.top) * (this.elRef.height / rect.height),
        type: 'down',
      },
    ];
    this.elRef.setPointerCapture(e.pointerId);
    this.isDown = true;
    this.controller.sendTouchEvent(
      {
        type: 'multiTouch',
        touches,
      },
      { canvasSize: this.getCanvasSize(), frameSize: this.getFrameSize() },
    );
  };

  private pointerMoveHandler = (e: PointerEvent) => {
    if (!this.isDown) return;
    const rect = this.elRef.getBoundingClientRect();
    const touches: MultiTouchPayload['touches'] = [
      {
        id: e.pointerId,
        x: (e.clientX - rect.left) * (this.elRef.width / rect.width),
        y: (e.clientY - rect.top) * (this.elRef.height / rect.height),
        type: 'down',
      },
    ];
    this.controller.sendTouchEvent(
      { type: 'multiTouch', touches },
      { canvasSize: this.getCanvasSize(), frameSize: this.getFrameSize() },
    );
  };

  private pointerUpHandler = (e: PointerEvent) => {
    const rect = this.elRef.getBoundingClientRect();

    const touches: MultiTouchPayload['touches'] = [
      {
        id: e.pointerId,
        x: (e.clientX - rect.left) * (this.elRef.width / rect.width),
        y: (e.clientY - rect.top) * (this.elRef.height / rect.height),
        type: 'up',
      },
    ];
    this.isDown = false;
    this.elRef.releasePointerCapture(e.pointerId);
    this.controller.sendTouchEvent(
      { type: 'multiTouch', touches },
      { canvasSize: this.getCanvasSize(), frameSize: this.getFrameSize() },
    );
  };

  private keydownHandler = (e: KeyboardEvent) => {
    this.controller.sendKeypressEvent({
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
