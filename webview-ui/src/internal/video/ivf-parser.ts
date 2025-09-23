export function parseIvfFrame(buffer: Uint8Array, offset: number) {
  const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 12);

  const frameSize = view.getUint32(0, true); // little-endian
  const ptsLow = view.getUint32(4, true);
  const ptsHigh = view.getUint32(8, true);
  const pts = ptsHigh * 2 ** 32 + ptsLow;

  return {
    frameSize,
    pts,
    headerSize: 12,
  };
}

export function isVp9KeyFrame(frameData: Uint8Array): boolean {
  const byte0 = frameData[0]!;
  const frameType = (byte0 >> 2) & 0x01; // Extract bit 2
  return frameType === 0; // 0 = keyframe, 1 = interframe
}

export function parseIvfChunk(buffer: Uint8Array) {
  const parsedFrames = [];
  let offset = 0;

  // Skip IVF global header
  if (buffer[0] === 0x44 && buffer[1] === 0x4b) {
    // 'DK'
    offset += 32;
  }

  while (offset + 12 <= buffer.length) {
    const { frameSize, pts, headerSize } = parseIvfFrame(buffer, offset);
    const frameStart = offset + headerSize;
    const frameEnd = frameStart + frameSize;

    if (frameEnd > buffer.length) break;

    const frameData = buffer.slice(frameStart, frameEnd);
    const isKey = isVp9KeyFrame(frameData);

    parsedFrames.push({
      pts,
      isKey,
      data: frameData,
    });

    offset = frameEnd;
  }

  return parsedFrames;
}
