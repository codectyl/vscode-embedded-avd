import cp from 'node:child_process';
import * as grpc from '@grpc/grpc-js';
import configurationStore from '../contributes/configuration';
import { EmulatorControllerClient } from '../generated/emulator_controller';
import { waitForClientReady } from '../utils/grpc';
import { getAvailablePort } from '../utils/network';
import { EmulatorManager } from './emulatorManager';

class AvdManager {
  getAvailableEmulators(): Promise<string[]> {
    const emulatorPath = configurationStore.emulatorPath;
    return new Promise((resolve, reject) => {
      cp.exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
        if (error) {
          reject(`Error listing AVDs: ${stderr}`);
        } else {
          const avds = stdout.split('\n').filter((line) => line.trim() !== '');
          resolve(avds);
        }
      });
    });
  }

  private async connectGrpc(
    grpcPort: number,
  ): Promise<EmulatorControllerClient> {
    console.log('Connecting to gRPC on port', grpcPort);
    const grpcClient = new EmulatorControllerClient(
      `localhost:${grpcPort}`,
      grpc.credentials.createInsecure(),
      {
        'grpc.keepalive_time_ms': 10000,
        'grpc.keepalive_timeout_ms': 5000,
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.max_receive_message_length': 1024 * 1024 * 100, // 100MB
        'grpc.max_send_message_length': 1024 * 1024 * 100,
      },
    );
    await waitForClientReady(grpcClient, 50000);
    console.log('Connected to gRPC on port', grpcPort);
    return grpcClient;
  }

  startEmulator = async (
    avdName: string,
    requestedPort?: number,
  ): Promise<EmulatorManager> => {
    const grpcPort = requestedPort ?? (await getAvailablePort(8554));
    const emulatorPath = configurationStore.emulatorPath;
    const emulatorProcess = cp.spawn(
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
    const grpcClient = await this.connectGrpc(grpcPort);
    emulatorProcess.on('exit', (code, signal) => {
      console.log(
        `Emulator ${avdName} process exited with code ${code} and signal ${signal}`,
      );
      grpcClient?.close();
    });
    return new EmulatorManager(avdName, emulatorProcess, grpcClient, grpcPort);
  };
}

export default AvdManager;
