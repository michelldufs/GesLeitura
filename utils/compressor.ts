import imageCompression from 'browser-image-compression';
import { formatCurrency } from './formatters';

/**
 * Compresses an image file according to project requirements:
 * - Max size: 0.2MB (200KB)
 * - Max dimension: 1024px
 * - Use WebWorker for performance
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: 'image/jpeg'
  };

  try {
    console.log(`Original file size: ${formatCurrency(file.size / 1024 / 1024)} MB`);
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed file size: ${formatCurrency(compressedFile.size / 1024 / 1024)} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original file if compression fails to avoid blocking the user flow,
    // but log the error clearly.
    return file;
  }
}
