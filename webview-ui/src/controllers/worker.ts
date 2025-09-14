import { createSignal, onCleanup, onMount } from 'solid-js';
import vscode from '../internal/vscode';

export type WorkerControllerType = ReturnType<typeof useWorkerController>;

export const useWorkerController = () => {
  const [emulators, setEmulators] = createSignal<string[]>([]);
  const [frame, setFrame] = createSignal<FrameUpdatePayload | null>(null);

  const handleMessage = (message: MessageEvent<ExtensionToWebviewPayload>) => {
    const data = message.data;
    switch (data.type) {
      case 'listEmulatorsResponse':
        setEmulators(data.emulators);
        break;
      case 'frame':
        setFrame(data);
        break;
    }
  };

  const refreshAvailableEmulators = (): void => {
    return vscode.postMessage({ type: 'listEmulators' });
  };

  const startEmulator = (name: string): Promise<boolean> => {
    vscode.postMessage({ type: 'startEmulator', name });
    return Promise.resolve(true);
  };

  const sendKeypressEvent = (event: KeyPressPayload) => {
    vscode.postMessage(event);
  };

  const sendTouchEvent = (
    event: MultiTouchPayload,
    { canvasSize, frameSize }: { canvasSize: Size; frameSize: Size },
  ) => {
    const mappedTouches = event.touches.map((t) => ({
      ...t,
      x: Math.round((t.x / canvasSize.width) * frameSize.width),
      y: Math.round((t.y / canvasSize.height) * frameSize.height),
    }));
    event.touches = mappedTouches;
    vscode.postMessage(event);
  };

  onMount(() => window.addEventListener('message', handleMessage));
  onCleanup(() => window.removeEventListener('message', handleMessage));

  return {
    emulators,
    frame,
    startEmulator,
    refreshAvailableEmulators,
    sendKeypressEvent,
    sendTouchEvent,
  };
};
