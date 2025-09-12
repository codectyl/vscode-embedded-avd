import cp from 'child_process';
import * as grpc from '@grpc/grpc-js';
import {
  EmulatorControllerClient,
  ImageFormat,
  ImageFormat_ImgFormat,
  KeyboardEvent,
  Touch,
  TouchEvent,
} from './generated/emulator_controller';
import {
  KeyPressPayload,
  MultiTouchPayload,
  TouchPayload,
} from './interfaces/payload';

export class EmulatorManager {
  private emulatorProcess?: cp.ChildProcess;
  private grpcClient: EmulatorControllerClient | null = null;

  // Multi-touch event forwarding
  sendMultiTouch({ touches }: MultiTouchPayload) {
    if (!this.grpcClient) {
      throw new Error('gRPC client not connected');
    }
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
    this.grpcClient.sendTouch({ touches: protoTouches, display: 0 }, () => {});
  }

  // Keyboard event forwarding
  sendKey(msg: KeyPressPayload) {
    if (!this.grpcClient) {
      throw new Error('gRPC client not connected');
    }

    const event = KeyboardEvent.create({
      key: msg.key,
    });
    this.grpcClient.sendKey(event, () => {});
  }

  startEmulator(
    emulatorPath: string,
    avdName: string,
    grpcPort: number = 8554,
  ) {
    this.emulatorProcess = cp.spawn(
      emulatorPath,
      ['-avd', avdName, '-grpc', grpcPort.toString(), '-gpu', 'auto'],
      { stdio: 'ignore' },
    );
  }

  connectGrpc(grpcPort: number = 8554) {
    console.log('Connecting to gRPC on port', grpcPort);
    this.grpcClient = new EmulatorControllerClient(
      `localhost:${grpcPort}`,
      grpc.credentials.createInsecure(),
    );
    console.log('Connected to gRPC', this.grpcClient);
  }

  getScreenshot(callback: (image: Uint8Array) => void) {
    if (!this.grpcClient) {
      throw new Error('gRPC client not connected');
    }

    this.grpcClient.getScreenshot(
      ImageFormat.create({ format: ImageFormat_ImgFormat.PNG }),
      (err, response) => {
        if (!err && response && response.image) {
          callback(response.image);
        }
      },
    );
  }

  // @Deprecated- Use sendMultiTouch instead. Maybe remove it later
  sendTouch({ x, y }: TouchPayload) {
    if (!this.grpcClient) {
      throw new Error('gRPC client not connected');
    }

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
    this.grpcClient.sendTouch(
      TouchEvent.create({ touches: [touch] }),
      () => {},
    );
  }

  dispose() {
    this.emulatorProcess?.kill();
    this.grpcClient?.close();
    this.grpcClient = null;
  }
}
