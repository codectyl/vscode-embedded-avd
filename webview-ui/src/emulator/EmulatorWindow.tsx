import { createSignal } from 'solid-js';
import EmulatorCanvas from './EmulatorCanvas';

export default function Emulator() {
  const [isLandscape, setIsLandscape] = createSignal(false);

  return (
    <div class="emulator-wrapper">
      {/* Top Bar */}
      <div class="top-bar">
        <button onClick={() => setIsLandscape(!isLandscape())}>Rotate</button>
      </div>

      {/* Side Buttons */}
      <div class="side-buttons left">
        <button class="btn">🔈</button>
        <button class="btn">🔇</button>
      </div>

      {/* Device Frame */}
      <div class={`device-frame ${isLandscape() ? 'landscape' : 'portrait'}`}>
        <div class="screen">
          <EmulatorCanvas />
        </div>
      </div>

      {/* Side Buttons Right */}
      <div class="side-buttons right">
        <button class="btn">⏻</button>
      </div>
    </div>
  );
}
