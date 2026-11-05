/**
 * Utility to preload an image using an off-screen Image object.
 * Resolves when the image is fully decoded and loaded, rejecting on error.
 *
 * @param {string} src - Image source (URL or base64 data URI).
 * @returns {Promise<HTMLImageElement>}
 */
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('Image source is required'));
      return;
    }

    const img = new Image();

    img.onload = () => {
      resolve(img);
    };

    img.onerror = (err) => {
      reject(err || new Error(`Failed to load image from source: ${src}`));
    };

    img.src = src;

    // Handle synchronously cached images
    if (img.complete && img.naturalWidth !== undefined && img.naturalWidth !== 0) {
      resolve(img);
    }
  });
}
