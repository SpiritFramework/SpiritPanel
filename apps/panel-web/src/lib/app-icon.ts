/**
 * Renders a square PWA app icon from a branding logo, favicon, or direct upload.
 *
 * This runs in the browser on purpose: the canvas API decodes every format an
 * admin might upload (including `.ico`, which server-side image libraries
 * generally cannot) and resizes without adding a native dependency to the API.
 *
 * The source image is fitted whole — never cropped — and the remaining space is
 * padded with the panel's accent gradient.
 */

/** Output size. 512 is the largest size manifests are expected to provide. */
const CANVAS_PX = 512;

/**
 * Fraction of the canvas the artwork may occupy.
 *
 * Maskable icons can be cropped to a circle of 80% diameter, whose inscribed
 * square is ~56% of the width. Staying inside that lets a single file serve
 * both the plain and maskable purposes.
 */
const CONTENT_SCALE = 0.56;

export interface AppIconResult {
  /** Base64 PNG body, without the `data:` prefix, ready for the upload API. */
  base64: string;
  /** Full data URL, for previewing before upload. */
  dataUrl: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Needed so an externally hosted logo does not taint the canvas. Skipped for
    // local sources, where some browsers fail the load outright when it is set.
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load that image'));
    img.src = src;
  });
}

/**
 * Builds the icon. Rejects when the image cannot be loaded or when a
 * cross-origin source taints the canvas, since neither is recoverable here.
 */
export async function generateAppIcon(
  src: string,
  accentColor: string,
  secondaryColor?: string,
): Promise<AppIconResult> {
  const img = await loadImage(src);

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_PX;
  canvas.height = CANVAS_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser');

  const gradient = ctx.createLinearGradient(0, 0, CANVAS_PX, CANVAS_PX);
  gradient.addColorStop(0, accentColor);
  gradient.addColorStop(1, secondaryColor || accentColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

  const natural = Math.max(img.naturalWidth, img.naturalHeight);
  if (!natural) throw new Error('That image appears to be empty');

  // Contain-fit: scale the longest edge to the content box, keeping aspect.
  const scale = (CANVAS_PX * CONTENT_SCALE) / natural;
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (CANVAS_PX - drawW) / 2, (CANVAS_PX - drawH) / 2, drawW, drawH);

  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL('image/png');
  } catch {
    throw new Error('That image is hosted elsewhere and blocks copying. Upload the file instead.');
  }

  return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(',') + 1) };
}
