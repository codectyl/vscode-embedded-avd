import { createSignal } from 'solid-js';

export default function EmulatorTabBar() {
  const [tabs, setTabs] = createSignal([
    { id: 1, name: 'Pixel 2 API 30 Alpha' },
    { id: 2, name: 'Pixel 4 API 33' },
  ]);
  const [activeTabId, setActiveTabId] = createSignal(1);

  const closeTab = (id: number) => {
    const filtered = tabs().filter((tab) => tab.id !== id);
    setTabs(filtered);
    if (id === activeTabId() && filtered.length && filtered[0]) {
      setActiveTabId(filtered[0].id);
    }
  };

  return (
    <div class="flex bg-[#2f2f2f] p-1 font-sans text-sm">
      {tabs().map((tab) => (
        <div
          class={`flex items-center px-3 py-1 mr-2 rounded-t cursor-pointer
            ${
              tab.id === activeTabId()
                ? 'bg-blue-400 text-white font-semibold'
                : 'bg-[#3a3a3a] text-white'
            }
          `}
          onClick={() => setActiveTabId(tab.id)}
        >
          {tab.name}
          <button
            class="ml-2 text-xs text-gray-300 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
