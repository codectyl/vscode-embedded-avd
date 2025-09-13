import { onMount, type JSX } from 'solid-js';

export default function EmulatorCanvas(): JSX.Element {
  let canvasRef: HTMLCanvasElement | undefined;
  const vscode = acquireVsCodeApi();

  onMount(() => {
    if (!canvasRef) return;

    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle incoming frame messages
    window.addEventListener('message', (event) => {
      const data = event.data as OutgoingPayloadToWebview;
      if (data.type === 'frame') {
        const img = new Image();
        img.src = `data:${data.mimetype};base64,${data.data}`;
        img.onload = () => ctx.drawImage(img, 0, 0);
      }
    });

    // Multi-touch support
    let touches: MultiTouchPayload['touches'] = [];

    canvas.addEventListener('pointerdown', (e) => {
      touches.push({
        id: e.pointerId,
        x: e.offsetX,
        y: e.offsetY,
        pressure: e.pressure || 1,
        type: 'DOWN',
      });
      canvas.setPointerCapture(e.pointerId);
      vscode.postMessage({ type: 'multiTouch', touches });
    });

    canvas.addEventListener('pointermove', (e) => {
      const idx = touches.findIndex((t) => t.id === e.pointerId);
      if (idx !== -1 && touches[idx]) {
        touches[idx] = {
          ...touches[idx],
          x: e.offsetX,
          y: e.offsetY,
          pressure: e.pressure || 1,
          type: 'MOVE',
        };
        vscode.postMessage({ type: 'multiTouch', touches });
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      const idx = touches.findIndex((t) => t.id === e.pointerId);
      if (idx !== -1 && touches[idx]) {
        touches[idx].type = 'UP';
        vscode.postMessage({ type: 'multiTouch', touches });
        touches.splice(idx, 1);
      }
    });

    // Keyboard support
    canvas.addEventListener('keydown', (e) => {
      vscode.postMessage({
        type: 'key',
        key: e.key,
        code: e.code,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        keyCode: e.keyCode,
        shift: e.shiftKey,
        meta: e.metaKey,
      } satisfies KeyPressPayload);
    });

    // Focus canvas to receive keyboard events
    canvas.focus();
  });

  return (
    <canvas
      id="emulatorCanvas"
      ref={canvasRef}
      tabindex="0"
      width="640"
      height="480"
      style={{ border: '1px solid black' }}
    />
  );
}
