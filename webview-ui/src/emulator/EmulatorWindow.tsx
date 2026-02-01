import { useManager } from '../controllers/manager';
import EmulatorTabBar from './EmulatorTabBar';
import EmulatorWebRTCStream from './EmulatorWebRTCStream';
import Toolbar from './Toolbar';

export default function Emulator() {
  const controller = useManager();

  return (
    <div id="emulatorWrapper" class="flex flex-col h-screen">
      <EmulatorTabBar controller={controller} />
      <Toolbar controller={controller} />
      <div class="flex-1 flex items-center justify-center overflow-hidden bg-black">
        <EmulatorWebRTCStream controller={controller} />
      </div>
    </div>
  );
}
