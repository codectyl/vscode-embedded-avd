import { ConfigurationTarget, workspace } from 'vscode';

type PreferenceKey = keyof ConfigurationStore['defaultPreferences'];
class ConfigurationStore {
  private configSection = 'embeddedAvd';

  private getPreferenceFromVSCode(key: string): string | undefined {
    const config = workspace.getConfiguration(this.configSection);
    return config.get<string>(key);
  }

  private setPreferenceInVSCode(key: string, value: string): Thenable<void> {
    const config = workspace.getConfiguration(this.configSection);
    return config.update(key, value, ConfigurationTarget.Global);
  }

  private defaultPreferences: { emulatorPath: string; adbPath: string } = {
    emulatorPath: 'emulator',
    adbPath: 'adb',
  };

  get emulatorPath(): string {
    return (
      this.getValue('emulatorPath') ?? this.defaultPreferences.emulatorPath
    );
  }

  get adbPath(): string {
    return this.getValue('adbPath') ?? this.defaultPreferences.adbPath;
  }

  public getValue(key: PreferenceKey): any {
    return this.getPreferenceFromVSCode(key) ?? this.defaultPreferences[key];
  }

  public setValue(key: PreferenceKey, value: string): void {
    this.setPreferenceInVSCode(key, value);
  }
}

const configurationStore = new ConfigurationStore();

export default configurationStore;
