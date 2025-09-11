import * as vscode from "vscode";
import { EmulatorManager } from "./emulatorManager";
import path from "path";
import fs from "fs";

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

      // TODO: When to start and stream the emulator
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

      panel.webview.html = getWebviewContent(context, panel.webview);

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

function getWebviewContent(
  context: vscode.ExtensionContext,
  webview: vscode.Webview
) {
  const nonce = getNonce();

  const htmlPath = path.join(context.extensionPath, "webview-ui", "index.html");

  console.log("reading html from", htmlPath);
  let html = fs.readFileSync(htmlPath, "utf8");

  html = html.replace(
    "{{ meta }}",
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">`
  );
  html = html.replace("{{nonce}}", nonce);

  return html;
}
