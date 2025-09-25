import { useManager } from '../controllers/manager';
import EmulatorTabBar from './EmulatorTabBar';
import EmulatorWebRTCStream from './EmulatorWebRTCStream';

export default function Emulator() {
  const controller = useManager();

  return (
    <div id="emulatorWrapper" class="flex flex-col h-screen">
      <EmulatorTabBar controller={controller} />
      <div class="flex-1 flex items-center justify-center overflow-hidden">
        <EmulatorWebRTCStream controller={controller} />
      </div>
    </div>
  );
}
