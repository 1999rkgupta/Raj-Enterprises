import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file before it is uploaded to save bandwidth.
 * Target maximum size: 1MB. Max width/height: 1920px.
 */
export async function compressImageBeforeUpload(file: File): Promise<File> {
  // If not an image, return original file
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const options = {
    maxSizeMB: 1, // Target max 1MB
    maxWidthOrHeight: 1920, // Downscale if larger than 1920px
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // Keep the original name and type
    return new File([compressedFile], file.name, {
      type: file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Image compression failed, uploading original file:', error);
    return file;
  }
}
