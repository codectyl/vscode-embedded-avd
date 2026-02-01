import type { Manager } from '../controllers/manager';

type PropType = {
  controller: Manager;
};

export default function Toolbar({ controller }: PropType) {
  return (
    <div class="flex items-center justify-center p-2 bg-gray-800 text-white gap-4 border-b border-gray-700">
      <button
        type="button"
        onClick={() => controller.togglePower()}
        class="p-2 hover:bg-gray-700 rounded transition-colors"
        title="Power"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          role="img"
          aria-label="Power"
        >
          <title>Power</title>
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
      </button>
      <div class="w-px h-6 bg-gray-600" />
      <button
        type="button"
        onClick={() => controller.volumeDown()}
        class="p-2 hover:bg-gray-700 rounded transition-colors"
        title="Volume Down"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          role="img"
          aria-label="Volume Down"
        >
          <title>Volume Down</title>
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => controller.volumeUp()}
        class="p-2 hover:bg-gray-700 rounded transition-colors"
        title="Volume Up"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          role="img"
          aria-label="Volume Up"
        >
          <title>Volume Up</title>
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      </button>
      <div class="w-px h-6 bg-gray-600" />
      <button
        type="button"
        onClick={() => controller.goBack()}
        class="p-2 hover:bg-gray-700 rounded transition-colors"
        title="Back"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          role="img"
          aria-label="Back"
        >
          <title>Back</title>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => controller.goHome()}
        class="p-2 hover:bg-gray-700 rounded transition-colors"
        title="Home"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          role="img"
          aria-label="Home"
        >
          <title>Home</title>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => controller.showRecents()}
        class="p-2 hover:bg-gray-700 rounded transition-colors"
        title="Recents"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          role="img"
          aria-label="Recents"
        >
          <title>Recents</title>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        </svg>
      </button>
    </div>
  );
}
