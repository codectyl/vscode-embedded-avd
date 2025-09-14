import cp from 'child_process';
import configurationStore from '../contributes/configuration';
import { EmulatorControllerClient } from '../generated/emulator_controller';
import * as grpc from '@grpc/grpc-js';
import { EmulatorManager } from './emulatorManager';
import { waitForClientReady } from '../utils/grpc';

class AvdManager {
  getAvailableEmulators(): Promise<string[]> {
    const emulatorPath = configurationStore.emulatorPath;
    return new Promise((resolve, reject) => {
      cp.exec(
        `${emulatorPath} -list-avds`,
        (error: any, stdout: string, stderr: any) => {
          if (error) {
            reject(`Error listing AVDs: ${stderr}`);
          } else {
            const avds = stdout
              .split('\n')
              .filter((line) => line.trim() !== '');
            resolve(avds);
          }
        },
      );
    });
  }

  private async connectGrpc(
    grpcPort: number = 8554,
  ): Promise<EmulatorControllerClient> {
    console.log('Connecting to gRPC on port', grpcPort);
    const grpcClient = new EmulatorControllerClient(
      `localhost:${grpcPort}`,
      grpc.credentials.createInsecure(),
    );
    await waitForClientReady(grpcClient, 50000);
    console.log('Connected to gRPC on port', grpcPort);
    return grpcClient;
  }

  startEmulator = async (
    avdName: string,
    grpcPort: number = 8554,
  ): Promise<EmulatorManager> => {
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
    let grpcClient = await this.connectGrpc(grpcPort);
    emulatorProcess.on('exit', (code, signal) => {
      console.log(
        `Emulator ${avdName} process exited with code ${code} and signal ${signal}`,
      );
      grpcClient?.close();
    });
    return new EmulatorManager(avdName, emulatorProcess, grpcClient);
  };
}

export default AvdManager;
