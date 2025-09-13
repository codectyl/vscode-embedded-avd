import cp from 'child_process';
import configurationStore from '../contributes/configuration';

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

  getRunningEmulators(): Promise<string[]> {
    const adbPath = configurationStore.adbPath;
    return new Promise((resolve, reject) => {
      cp.exec(
        `${adbPath} devices`,
        (error: any, stdout: string, stderr: any) => {
          if (error) {
            reject(`Error listing devices: ${stderr}`);
          } else {
            const devices = stdout
              .split('\n')
              .slice(1)
              .map((line) => line.split('\t')[0])
              .filter(
                (line): line is string =>
                  typeof line === 'string' && line.trim().length > 0,
              );
            // TODO: Filter only emulators
            resolve(devices);
          }
        },
      );
    });
  }
}

export default AvdManager;
