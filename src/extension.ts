import * as vscode from "vscode";
import { EmulatorManager } from "./emulatorManager";

export function activate(context: vscode.ExtensionContext) {
  let panel: vscode.WebviewPanel | undefined;
  const emulatorManager = new EmulatorManager();

  // Register configuration settings
  context.subscriptions.push(
    vscode.commands.registerCommand("androidEmulator.configure", async () => {
      const emulatorPath = await vscode.window.showInputBox({
        prompt: "Enter path to Android Emulator binary",
      });
      const avdName = await vscode.window.showInputBox({
        prompt: "Enter AVD name",
      });
      if (emulatorPath && avdName) {
        await vscode.workspace
          .getConfiguration()
          .update(
            "androidEmulator.emulatorPath",
            emulatorPath,
            vscode.ConfigurationTarget.Global
          );
        await vscode.workspace
          .getConfiguration()
          .update(
            "androidEmulator.avdName",
            avdName,
            vscode.ConfigurationTarget.Global
          );
        vscode.window.showInformationMessage("Emulator configuration saved.");
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("androidEmulator.open", async () => {
      panel = vscode.window.createWebviewPanel(
        "androidEmulator",
        "Android Emulator",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      // Read configuration
      const config = vscode.workspace.getConfiguration("androidEmulator");
      // TODO: remove
      const emulatorPath =
        config.get<string>("emulatorPath") ||
        "/Users/deepak/Library/Android/sdk/emulator/emulator";
      const avdName = config.get<string>("avdName") || "Medium_Phone";
      if (!emulatorPath || !avdName) {
        vscode.window.showErrorMessage(
          "Please configure emulator path and AVD name first."
        );
        panel.dispose();
        return;
      }
      vscode.window.showInformationMessage(
        `Starting emulator: ${emulatorPath}\nAVD: ${avdName}`
      );

      // Start emulator and connect gRPC
      emulatorManager.startEmulator(emulatorPath, avdName, 8554);
      setTimeout(() => emulatorManager.connectGrpc(8554), 5000); // Wait for emulator to start

      // Periodically fetch screenshot and send to WebView
      const interval = setInterval(() => {
        emulatorManager.getScreenshot((image: Buffer) => {
          panel?.webview.postMessage({
            type: "frame",
            data: image.toString("base64"),
          });
        });
      }, 1000); // ~10 FPS

      panel.webview.html = getWebviewContent(panel.webview);

      panel.webview.onDidReceiveMessage((msg) => {
        if (msg.type === "touch") {
          emulatorManager.sendTouch(msg.x, msg.y);
        }
        if (msg.type === "multiTouch") {
          emulatorManager.sendMultiTouch(msg.touches);
        }
        if (msg.type === "key") {
          emulatorManager.sendKey(msg);
        }
      });

      panel.onDidDispose(() => {
        clearInterval(interval);
        emulatorManager.dispose();
      });
    })
  );
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getWebviewContent(webview: vscode.Webview) {
  const nonce = getNonce();
  return `
    <html>
    <head>
    	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">

			
    </head>
    <body>
      <div>Hello world</div>
      <canvas id="emulatorCanvas" width="720" height="1280" tabindex="0" style="outline:none;"></canvas>
      <script>
        const vscode = acquireVsCodeApi();
        const canvas = document.getElementById('emulatorCanvas');
        const ctx = canvas.getContext('2d');
        window.addEventListener('message', event => {
          if (event.data.type === 'frame') {
            const img = new Image();
            img.src = 'data:image/png;base64,' + event.data.data;
            img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        });

        // Multi-touch support
        let touches = [];
        canvas.addEventListener('pointerdown', e => {
          touches.push({ id: e.pointerId, x: e.offsetX, y: e.offsetY, pressure: e.pressure || 1, type: 'DOWN' });
          canvas.setPointerCapture(e.pointerId);
          vscode.postMessage({ type: 'multiTouch', touches });
        });
        canvas.addEventListener('pointermove', e => {
          const idx = touches.findIndex(t => t.id === e.pointerId);
          if (idx !== -1) {
            touches[idx].x = e.offsetX;
            touches[idx].y = e.offsetY;
            touches[idx].pressure = e.pressure || 1;
            touches[idx].type = 'MOVE';
            vscode.postMessage({ type: 'multiTouch', touches });
          }
        });
        canvas.addEventListener('pointerup', e => {
          const idx = touches.findIndex(t => t.id === e.pointerId);
          if (idx !== -1) {
            touches[idx].type = 'UP';
            vscode.postMessage({ type: 'multiTouch', touches });
            touches.splice(idx, 1);
          }
        });

        // Keyboard support
        canvas.addEventListener('keydown', e => {
          vscode.postMessage({ type: 'key', key: e.key, code: e.code, keyCode: e.keyCode, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey });
        });
        canvas.focus();
      </script>
    </body>
    </html>
  `;
}
