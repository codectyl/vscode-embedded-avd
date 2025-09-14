import { useWorkerController } from '../controllers/worker';
import EmulatorTabBar from './EmulatorTabBar';
import EmulatorCanvas from './EmulatorCanvas';

export default function Emulator() {
  const controller = useWorkerController();

  return (
    <div id="emulatorWrapper" class="flex flex-col h-screen">
      <EmulatorTabBar controller={controller} />
      <div class="flex-1 flex items-center justify-center overflow-hidden">
        <EmulatorCanvas controller={controller} />
      </div>
    </div>
  );
}
