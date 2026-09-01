// Client-side image optimization: resize + convert to WebP before upload.
// Reduces file size dramatically for logos, player photos, news images, etc.
// Falls back gracefully if the browser cannot encode WebP (rare).

const WEBP_SUPPORTED_CACHE = null;

function isWebpSupported() {
  if (WEBP_SUPPORTED_CACHE !== null) return Promise.resolve(WEBP_SUPPORTED_CACHE);
  return new Promise((resolve) => {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    c.toBlob(
      (blob) => resolve(!!blob && blob.type === 'image/webp'),
      'image/webp',
      0.8
    );
  });
}

/**
 * Optimize an image File: resize to maxDim (longest edge) and convert to WebP.
 * @param {File} file - original image file
 * @param {object} opts
 * @param {number} opts.maxDim - max longest edge in px (default 512)
 * @param {number} opts.quality - WebP quality 0-1 (default 0.82)
 * @returns {Promise<File>} optimized File (image/webp) or original on failure
 */
export async function optimizeImage(file, { maxDim = 512, quality = 0.82 } = {}) {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;

  // Skip tiny images — already small, keep as-is (e.g. tiny favicons)
  if (file.size > 0 && file.size < 25 * 1024) return file;

  const webpOk = await isWebpSupported();
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });

    let { width, height } = img;
    if (maxDim > 0 && (width > maxDim || height > maxDim)) {
      if (width >= height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const type = webpOk ? 'image/webp' : 'image/jpeg';
    const ext = webpOk ? '.webp' : '.jpg';

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, type, quality)
    );

    if (!blob) return file;

    const baseName = (file.name || 'image').replace(/\.[^/.]+$/, '');
    return new File([blob], `${baseName}${ext}`, { type });
  } catch (e) {
    // Any failure → return original so upload still works
    return file;
  }
}

/**
 * Optimize + upload via the Core.UploadFile integration.
 * @param {File} file
 * @param {object} opts - { maxDim, quality }
 * @returns {Promise<{file_url: string}>}
 */
export async function uploadOptimizedImage(file, opts) {
  const { base44 } = await import('@/api/base44Client');
  const optimized = await optimizeImage(file, opts);
  return await base44.integrations.Core.UploadFile({ file: optimized });
}