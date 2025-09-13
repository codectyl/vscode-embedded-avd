import cp from 'child_process';
import * as grpc from '@grpc/grpc-js';
import {
  EmulatorControllerClient,
  EmulatorStatus,
  Image,
  ImageFormat,
  ImageFormat_ImgFormat,
  KeyboardEvent,
  Touch,
} from '../generated/emulator_controller';
import {
  KeyPressPayload,
  MultiTouchPayload,
  TouchPayload,
} from '../interfaces/payload';
import { grpcAsync } from '../utils/grpc';
import { GRPCClientNotConnectedError } from '../errors/error';
import configurationStore from '../contributes/configuration';

function ensureGRPCClientConnected(
  grpcClient: EmulatorControllerClient | null,
): asserts grpcClient is EmulatorControllerClient {
  if (!grpcClient) {
    throw new GRPCClientNotConnectedError();
  }
}

export class EmulatorManager {
  private emulatorProcess?: cp.ChildProcess;
  private grpcClient: EmulatorControllerClient | null = null;

  startEmulator(avdName: string, grpcPort: number = 8554) {
    const emulatorPath = configurationStore.emulatorPath;
    this.emulatorProcess = cp.spawn(
      emulatorPath,
      [
        '-avd',
        avdName,
        '-grpc',
        grpcPort.toString(),
        '-gpu',
        'auto',
        '-no-window',
      ],
      { stdio: 'ignore' },
    );
    this.emulatorProcess.on('exit', (code, signal) => {
      console.log(
        `Emulator ${avdName} process exited with code ${code} and signal ${signal}`,
      );
      this.grpcClient?.close();
      this.grpcClient = null;
    });
  }

  async getEmulatorStatus(): Promise<EmulatorStatus> {
    ensureGRPCClientConnected(this.grpcClient);
    return await grpcAsync(this.grpcClient.getStatus, {});
  }

  // Multi-touch event forwarding
  async sendMultiTouch({ touches }: MultiTouchPayload) {
    ensureGRPCClientConnected(this.grpcClient);
    const protoTouches = touches.map((t) => ({
      x: t.x,
      y: t.y,
      pressure: t.pressure,
      type: t.type,
      identifier: t.id,
      touchMajor: 1,
      touchMinor: 1,
      expiration: 0,
      orientation: 0,
    }));
    await grpcAsync(this.grpcClient.sendTouch, {
      touches: protoTouches,
      display: 0,
    });
  }

  // Keyboard event forwarding
  sendKey(msg: KeyPressPayload) {
    if (!this.grpcClient) {
      throw new Error('gRPC client not connected');
    }

    const event = KeyboardEvent.create({
      key: msg.key,
    });
    return grpcAsync(this.grpcClient.sendKey, event);
  }

  connectGrpc(grpcPort: number = 8554) {
    console.log('Connecting to gRPC on port', grpcPort);
    this.grpcClient = new EmulatorControllerClient(
      `localhost:${grpcPort}`,
      grpc.credentials.createInsecure(),
    );
    console.log('Connected to gRPC', this.grpcClient);
  }

  async getScreenshot(): Promise<Image> {
    ensureGRPCClientConnected(this.grpcClient);
    return await grpcAsync(
      this.grpcClient.getScreenshot,
      ImageFormat.create({ format: ImageFormat_ImgFormat.PNG }),
    );
  }

  async streamScreenshot(): Promise<grpc.ClientReadableStream<Image>> {
    ensureGRPCClientConnected(this.grpcClient);
    return this.grpcClient.streamScreenshot(
      ImageFormat.create({ format: ImageFormat_ImgFormat.PNG }),
    );
  }

  // @Deprecated- Use sendMultiTouch instead. Maybe remove it later
  sendTouch({ x, y }: TouchPayload) {
    ensureGRPCClientConnected(this.grpcClient);
    const touch = Touch.create({
      x,
      y,
      pressure: 1,
      identifier: 0,
      touchMajor: 1,
      touchMinor: 1,
      expiration: 0,
      orientation: 0,
    });
    return grpcAsync(this.grpcClient.sendTouch, {
      touches: [touch],
      display: 0,
    });
  }

  dispose() {
    this.emulatorProcess?.kill();
    this.grpcClient?.close();
    this.grpcClient = null;
  }
}
