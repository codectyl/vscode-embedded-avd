export function* extractNALUnits(buffer: Uint8Array): Generator<Uint8Array> {
  const NAL_SEPARATOR = [0, 0, 0, 1];
  let start = 0;

  for (let i = 0; i < buffer.length - 4; i++) {
    if (
      buffer[i] === 0 &&
      buffer[i + 1] === 0 &&
      buffer[i + 2] === 0 &&
      buffer[i + 3] === 1
    ) {
      if (start !== i) {
        yield buffer.slice(start, i); // previous NAL
      }
      start = i;
    }
  }

  if (start < buffer.length) {
    yield buffer.slice(start);
  }
}

export function buildAvcc(
  sps: Uint8Array<ArrayBufferLike>[],
  pps: Uint8Array<ArrayBufferLike>[],
) {
  if (sps.length === 0) throw new Error('No SPS found');
  if (pps.length === 0) throw new Error('No PPS found');

  const spsNal = sps[0]!;
  const ppsNal = pps[0]!;

  const avcc = [
    0x01, // configurationVersion
    spsNal[1], // profile (AVCProfileIndication)
    spsNal[2], // compatibility
    spsNal[3], // level (AVCLevelIndication)
    0xff, // 111111 + lengthSizeMinusOne(3) => 4-byte NALU lengths
    0xe1, // 111 + numOfSPS (1)
    (spsNal.length >> 8) & 0xff,
    spsNal.length & 0xff,
    ...spsNal,
    0x01, // numOfPPS
    (ppsNal.length >> 8) & 0xff,
    ppsNal.length & 0xff,
    ...ppsNal,
  ];

  // @ts-ignore
  return new Uint8Array(avcc);
}

export function extractSPSPPS(h264Bytes: Uint8Array) {
  const sps = [];
  const pps = [];

  let i = 0;
  while (i < h264Bytes.length - 4) {
    // find start code
    if (
      h264Bytes[i] === 0x00 &&
      h264Bytes[i + 1] === 0x00 &&
      h264Bytes[i + 2] === 0x00 &&
      h264Bytes[i + 3] === 0x01
    ) {
      const nalUnitType = h264Bytes[i + 4]! & 0x1f;

      // find next start code
      let j = i + 4;
      while (
        j < h264Bytes.length - 4 &&
        !(
          h264Bytes[j] === 0x00 &&
          h264Bytes[j + 1] === 0x00 &&
          h264Bytes[j + 2] === 0x00 &&
          h264Bytes[j + 3] === 0x01
        )
      ) {
        j++;
      }

      const nal = h264Bytes.subarray(i + 4, j);
      if (nalUnitType === 7)
        sps.push(nal); // SPS
      else if (nalUnitType === 8) pps.push(nal); // PPS

      i = j;
    } else {
      i++;
    }
  }
  return { sps, pps };
}
