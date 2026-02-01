import { WebSocket, WebSocketServer } from 'ws';
import type { DisplayConfiguration } from '../../generated/emulator_controller';
import type { FrameInfoDataChannelPayload } from '../../interfaces/payload';
import type { Size } from '../../utils/models';
import { getAvailablePort } from '../../utils/network';

export default class WebSocketHelper {
  private wss: WebSocketServer | undefined;
  private port: number | undefined;
  private lastFrameInfo: FrameInfoDataChannelPayload | undefined;
  onMessage: ((payload: any) => void) | undefined;

  async start(): Promise<number> {
    this.port = await getAvailablePort(9000);
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws, req) => {
      console.log(
        `[WebSocketHelper] Webview connected to frame WebSocket (port ${this.port})`,
      );

      req.socket.setNoDelay(true);

      if (this.lastFrameInfo) {
        console.log('[WebSocketHelper] Sending initial metadata to new client');
        ws.send(JSON.stringify({ type: 'metadata', ...this.lastFrameInfo }));
      }

      ws.on('message', (message) => {
        try {
          const payload = JSON.parse(message.toString());
          this.onMessage?.(payload);
        } catch (e) {
          console.error(
            '[WebSocketHelper] Error parsing message from webview:',
            e,
          );
        }
      });
    });

    console.log(`[WebSocketHelper] Server started on port ${this.port}`);
    return this.port;
  }

  putFrame(
    frameData: Uint8Array,
    size: Size,
    displayConfig: DisplayConfiguration,
  ) {
    if (!this.wss || this.wss.clients.size === 0) return;

    const hasMetadataChanged =
      !this.lastFrameInfo ||
      this.lastFrameInfo.frameSize.width !== size.width ||
      this.lastFrameInfo.frameSize.height !== size.height ||
      this.lastFrameInfo.displayConfig.width !== displayConfig.width ||
      this.lastFrameInfo.displayConfig.height !== displayConfig.height;

    if (hasMetadataChanged) {
      this.lastFrameInfo = {
        frameSize: size,
        displayConfig,
      };
      console.log('[WebSocketHelper] Metadata changed, broadcasting update');
      const metadataMsg = JSON.stringify({
        type: 'metadata',
        ...this.lastFrameInfo,
      });
      for (const client of this.wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(metadataMsg);
        }
      }
    }

    // Send the raw frame as binary
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(frameData, { binary: true });
      }
    }
  }

  close() {
    this.wss?.close();
  }
}
