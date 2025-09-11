console.log("Webview script loaded and running");
window.addEventListener("DOMContentLoaded", () => {
  const vscode = acquireVsCodeApi();
const canvas = document.getElementById("emulatorCanvas");
const ctx = canvas.getContext("2d");
window.addEventListener("message", (event) => {
  if (event.data.type === "frame") {
    const img = new Image();
    img.src = "data:image/jpeg;base64," + event.data.data;
    img.onload = () => ctx.drawImage(img, 0, 0);
  }
});

// Multi-touch support
let touches = [];
canvas.addEventListener("pointerdown", (e) => {
  touches.push({
    id: e.pointerId,
    x: e.offsetX,
    y: e.offsetY,
    pressure: e.pressure || 1,
    type: "DOWN",
  });
  canvas.setPointerCapture(e.pointerId);
  vscode.postMessage({ type: "multiTouch", touches });
});
canvas.addEventListener("pointermove", (e) => {
  const idx = touches.findIndex((t) => t.id === e.pointerId);
  if (idx !== -1) {
    touches[idx].x = e.offsetX;
    touches[idx].y = e.offsetY;
    touches[idx].pressure = e.pressure || 1;
    touches[idx].type = "MOVE";
    vscode.postMessage({ type: "multiTouch", touches });
  }
});
canvas.addEventListener("pointerup", (e) => {
  const idx = touches.findIndex((t) => t.id === e.pointerId);
  if (idx !== -1) {
    touches[idx].type = "UP";
    vscode.postMessage({ type: "multiTouch", touches });
    touches.splice(idx, 1);
  }
});

// Keyboard support
canvas.addEventListener("keydown", (e) => {
  vscode.postMessage({
    type: "key",
    key: e.key,
    code: e.code,
    keyCode: e.keyCode,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    meta: e.metaKey,
  });
});
canvas.focus();

});
