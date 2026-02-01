import type { Manager } from '../controllers/manager';

export default function EmulatorTabBar({
  controller,
}: {
  controller: Manager;
}) {
  const sendKeyEvent = (
    key: 'AppSwitch' | 'GoBack' | 'GoHome' | 'Power',
    eventType: 'keydown' | 'keyup',
  ) => {
    controller.sendEvent({
      type: 'key',
      key,
      keyCode: 0,
      eventType,
    });
  };

  return (
    <div class="flex items-center bg-[#2f2f2f] h-10 text-white font-sans text-sm">
      {/* Power (left) */}
      <div class="flex-1">
        <button
          type="button"
          class="justify-start px-3 hover:bg-[#3a3a3a]"
          onMouseDown={() => sendKeyEvent('Power', 'keydown')}
          onMouseUp={() => sendKeyEvent('Power', 'keyup')}
        >
          ⏻
        </button>
      </div>

      {/* Nav (center) */}
      <div class="flex flex-1 mx-auto justify-center">
        <button
          type="button"
          class="hover:bg-[#3a3a3a] px-3"
          onMouseDown={() => sendKeyEvent('GoBack', 'keydown')}
          onMouseUp={() => sendKeyEvent('GoBack', 'keyup')}
        >
          ←
        </button>
        <button
          type="button"
          class="hover:bg-[#3a3a3a] px-3"
          onMouseDown={() => sendKeyEvent('GoHome', 'keydown')}
          onMouseUp={() => sendKeyEvent('GoHome', 'keyup')}
        >
          ○
        </button>
        <button
          type="button"
          class="hover:bg-[#3a3a3a] px-3"
          onMouseDown={() => sendKeyEvent('AppSwitch', 'keydown')}
          onMouseUp={() => sendKeyEvent('AppSwitch', 'keyup')}
        >
          □
        </button>
      </div>

      {/* Right spacer */}
      <div class="flex-1 w-full" />
    </div>
  );
}
