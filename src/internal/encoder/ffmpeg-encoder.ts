import { spawn, exec } from 'child_process';
import {
  DisplayConfiguration,
  Image,
} from '../../generated/emulator_controller';
import { Size } from '../../utils/models';
import configurationStore from '../../contributes/configuration';

class FFMpegRawEncoder {
  ffmpegProcess: ReturnType<FFMpegRawEncoder['encodeRawImagesToVideoProcess']>;
  width: number;
  height: number;

  static async checkFfmpegInstallation(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      return exec('ffmpeg -version', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
    });
  }

  private getBestH264Encoder(): string {
    if (process.platform === 'darwin') {
      return 'h264_videotoolbox'; // MacOS Hardware acceleration
    }
    /* 
      const encoders = [
      'h264_nvenc', // NVIDIA GPU
      'h264_amf', // AMD GPU
      'h264_videotoolbox', // MacOS Hardware
      'libx264', // Software
    ];
    // TODO: Add checks for NVIDIA and AMD GPUs
   */
    return 'libx264'; // Software encoding as default
  }

  private encodeRawImagesToVideoProcess(params: {
    resolution: Size;
    fps: number;
  }) {
    const { width, height } = params.resolution;
    const { fps } = params;
    console.log('Starting FFMPEG with', { width, height, fps });
    const ffmpeg = spawn(configurationStore.ffmpegPath, [
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24', // input pixel format
      '-s',
      `${width}x${height}`, // input resolution
      '-r',
      String(fps), // input fps
      '-i',
      '-', // read from stdin

      '-c:v',
      this.getBestH264Encoder(),
      '-preset',
      'llhp', // low-latency high performance
      '-tune',
      'zerolatency', // reduce latency
      '-pix_fmt',
      'yuv420p', // output pixel format
      '-g',
      String(fps), // GOP = 1 sec
      '-keyint_min',
      String(fps),
      '-movflags',
      'frag_keyframe+empty_moov+default_base_moof',
      '-f',
      'mp4',
      'pipe:1',
    ]);

    return ffmpeg;
  }

  constructor(params: { resolution: Size; fps: number }) {
    this.width = params.resolution.width;
    this.height = params.resolution.height;
    this.ffmpegProcess = this.encodeRawImagesToVideoProcess(params);
  }

  displayConfig!: DisplayConfiguration;
  frameSize!: Size;

  addFrame(frame: Image, displayConfig: DisplayConfiguration) {
    this.displayConfig = displayConfig;
    this.frameSize = {
      width: frame.format?.width || 0,
      height: frame.format?.height || 0,
    };

    return this.ffmpegProcess.stdin?.write(frame.image);
  }

  private dataListenerCb?: (chunk: Buffer) => void;

  setupDataListener(
    cb: (params: {
      chunk: Buffer;
      displayConfig: DisplayConfiguration;
      frameSize: Size;
      mimeType: string;
    }) => void,
  ) {
    if (this.dataListenerCb) {
      this.ffmpegProcess.stdout?.off('data', this.dataListenerCb);
    }
    this.dataListenerCb = (chunk: Buffer) => {
      console.log('FFMPEG emitted data chunk of size', chunk.length);
      cb({
        chunk,
        displayConfig: this.displayConfig,
        frameSize: this.frameSize,
        mimeType: 'video/mp4',
      });
    };

    this.ffmpegProcess.stdout?.on('data', this.dataListenerCb);
  }

  setupErrorListener(cb: (error: Error) => void) {
    this.ffmpegProcess.on('error', cb);
  }

  close() {
    this.ffmpegProcess.stdin?.end();
    this.ffmpegProcess.kill();
  }
}

export default FFMpegRawEncoder;
