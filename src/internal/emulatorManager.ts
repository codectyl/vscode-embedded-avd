import cp from 'child_process';
import * as grpc from '@grpc/grpc-js';
import {
  DisplayConfigurations,
  EmulatorControllerClient,
  EmulatorStatus,
  Image,
  ImageFormat,
  ImageFormat_ImgFormat,
  KeyboardEvent,
  KeyboardEvent_KeyCodeType,
  KeyboardEvent_KeyEventType,
  Touch,
} from '../generated/emulator_controller';
import {
  KeyPressPayload,
  MultiTouchPayload,
  TouchPayload,
} from '../interfaces/payload';
import { GRPCClientNotConnectedError } from '../errors/error';
import { GRPCAsync } from '../utils/grpc';

function ensureGRPCClientConnected(
  grpcClient: EmulatorControllerClient | null,
): asserts grpcClient is EmulatorControllerClient {
  // TODO: More robust check can be added later ??
  if (!grpcClient) {
    throw new GRPCClientNotConnectedError();
  }
}

export class EmulatorManager {
  constructor(
    public avdName: string,
    public emulatorProcess: cp.ChildProcess,
    public grpcClient: EmulatorControllerClient,
  ) {}

  async getEmulatorStatus(): Promise<EmulatorStatus> {
    ensureGRPCClientConnected(this.grpcClient);
    return await GRPCAsync(this.grpcClient).run(this.grpcClient.getStatus, {});
  }

  async getDisplayConfigs(): Promise<DisplayConfigurations> {
    ensureGRPCClientConnected(this.grpcClient);
    return await GRPCAsync(this.grpcClient).run(
      this.grpcClient.getDisplayConfigurations,
      {},
    );
  }

  // Multi-touch event forwarding
  async sendMultiTouch({ touches }: MultiTouchPayload) {
    ensureGRPCClientConnected(this.grpcClient);
    const protoTouches: Touch[] = touches.map(
      (t) =>
        ({
          x: t.x,
          y: t.y,
          pressure: t.type === 'up' ? 0 : 1,
          identifier: t.id,
          touchMajor: 1,
          touchMinor: 1,
          expiration: 0,
          orientation: 0,
        }) satisfies Touch,
    );
    await GRPCAsync(this.grpcClient).run(this.grpcClient.sendTouch, {
      touches: protoTouches,
      display: 0,
    });
  }

  // Keyboard event forwarding
  sendKey(msg: KeyPressPayload) {
    ensureGRPCClientConnected(this.grpcClient);

    const event = KeyboardEvent.create({
      key: msg.key,
      keyCode: msg.keyCode,
    });

    switch (process.platform) {
      case 'darwin':
        event.codeType = KeyboardEvent_KeyCodeType.Mac;
        break;
      case 'win32':
        event.codeType = KeyboardEvent_KeyCodeType.Win;
        break;
      case 'linux':
      case 'freebsd':
        event.codeType = KeyboardEvent_KeyCodeType.XKB;
        break;
      default:
        event.codeType = KeyboardEvent_KeyCodeType.Usb;
    }

    switch (msg.eventType) {
      case 'keydown':
        event.eventType = KeyboardEvent_KeyEventType.keydown;
        break;
      case 'keyup':
        event.eventType = KeyboardEvent_KeyEventType.keyup;
        break;
      case 'keypress':
        event.eventType = KeyboardEvent_KeyEventType.keypress;
        break;
    }

    return GRPCAsync(this.grpcClient).run(this.grpcClient.sendKey, event);
  }

  async getScreenshot({
    width,
    height,
    format,
  }: {
    width?: number;
    height?: number;
    format?: ImageFormat_ImgFormat;
  } = {}): Promise<Image> {
    ensureGRPCClientConnected(this.grpcClient);
    return await GRPCAsync(this.grpcClient).run(
      this.grpcClient.getScreenshot,
      ImageFormat.create({
        format: format ?? ImageFormat_ImgFormat.PNG,
        width: width ?? 0,
        height: height ?? 0,
      }),
    );
  }

  streamScreenshot({
    width,
    height,
    format,
  }: {
    width?: number;
    height?: number;
    format?: ImageFormat_ImgFormat;
  } = {}): grpc.ClientReadableStream<Image> {
    ensureGRPCClientConnected(this.grpcClient);
    return this.grpcClient.streamScreenshot(
      ImageFormat.create({
        format: format ?? ImageFormat_ImgFormat.PNG,
        width: width ?? 0,
        height: height ?? 0,
      }),
    );
  }

  sendTouch({ x, y }: TouchPayload) {
    ensureGRPCClientConnected(this.grpcClient);
    return this.sendMultiTouch({
      type: 'multiTouch',
      touches: [
        { id: 0, x, y, type: 'down' },
        { id: 0, x, y, type: 'up' },
      ],
    });
  }

  dispose() {
    this.emulatorProcess?.kill();
    this.grpcClient?.close();
  }
}
