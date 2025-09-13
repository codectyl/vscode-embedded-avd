import sharp, { SharpInput } from 'sharp';

class MediaUtils {
  static async compressImage(image: SharpInput): Promise<
    | {
        data: Buffer;
        mimetype: string;
        size: { width: number; height: number };
      }
    | undefined
  > {
    try {
      const compressedImage = await sharp(image)
        .jpeg({ quality: 70 }) // adjust quality between 30–80 as needed
        .toBuffer({ resolveWithObject: true });

      if (!compressedImage.info.width || !compressedImage.info.height) {
        throw new Error('Could not determine image dimensions');
      }

      return {
        data: compressedImage.data,
        mimetype: `image/${compressedImage.info.format}`,
        size: {
          width: compressedImage.info.width,
          height: compressedImage.info.height,
        },
      };
    } catch (err) {
      console.error('Error compressing image:', err);
      return;
    }
  }
}

export default MediaUtils;
