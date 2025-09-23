import { extractNALUnits } from './h264-parser';
import { parseIvfChunk } from './ivf-parser';

export function parseVideoFrameAndDecode(
  decoder: VideoDecoder,
  data: Uint8Array,
  codec: string,
) {
  if (codec.startsWith('avc1')) {
    for (const nal of extractNALUnits(data)) {
      const nalType = nal[4]! & 0x1f;
      const chunkType = nalType === 5 ? 'key' : 'delta';

      const chunk = new EncodedVideoChunk({
        type: chunkType,
        timestamp: performance.now() * 1000, // in microseconds
        data: nal,
      });

      decoder.decode(chunk);
    }
  } else if (codec.startsWith('vp09')) {
    const parsedFrames = parseIvfChunk(data);
    for (const frame of parsedFrames) {
      const chunk = new EncodedVideoChunk({
        timestamp: frame.pts,
        type: frame.isKey ? 'key' : 'delta',
        data: frame.data,
      });

      decoder.decode(chunk);
    }
  } else {
    throw new Error(`Unsupported codec: ${codec}`);
  }
}
