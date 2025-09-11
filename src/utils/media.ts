import sharp, { SharpInput } from "sharp";

class MediaUtils {
  static async compressImage(image: SharpInput): Promise<Buffer | undefined> {
    try {
      const compressedImage = await sharp(image)
        .jpeg({ quality: 70 }) // adjust quality between 30–80 as needed
        .toBuffer();

      return compressedImage;
    } catch (err) {
      console.error("Error compressing image:", err);
    }
  }
}

export default MediaUtils;
