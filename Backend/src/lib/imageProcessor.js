let sharpInstance = undefined;

async function getSharp() {
  if (sharpInstance !== undefined) {
    return sharpInstance;
  }
  try {
    const mod = await import('sharp');
    sharpInstance = mod.default || mod;
  } catch (err) {
    // Sharp native binary unavailable or blocked by OS policy
    sharpInstance = null;
  }
  return sharpInstance;
}

const MAX_SIZE_MB = parseInt(process.env.MAX_PROFILE_IMAGE_SIZE_MB || '2', 10);
export const MAX_PROFILE_IMAGE_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/**
 * Validates magic bytes for JPEG, PNG, and WebP.
 * @param {Buffer} buffer 
 * @returns {string|null} detected MIME type or null
 */
export function detectImageMimeType(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF ... WEBP
  const isRiff =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (isRiff && isWebp) {
    return 'image/webp';
  }

  return null;
}

/**
 * Validates and processes image buffer for Student profile storage.
 * Resizes to max 500x500 maintaining aspect ratio and encodes to WebP Base64 if sharp is available,
 * otherwise validates format/size and stores as-is in base64.
 * 
 * @param {Buffer} buffer - Raw image buffer
 * @returns {Promise<{ profileImageData: string, profileImageMimeType: string, sizeBytes: number }>}
 */
export async function processStudentProfileImageBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    const error = new Error('Invalid image buffer provided');
    error.status = 400;
    throw error;
  }

  // 1. Enforce size limit
  if (buffer.length > MAX_PROFILE_IMAGE_SIZE_BYTES) {
    const error = new Error(`Image size exceeds the maximum limit of ${MAX_SIZE_MB}MB`);
    error.status = 413;
    throw error;
  }

  // 2. Validate magic bytes signature
  const detectedMime = detectImageMimeType(buffer);
  if (!detectedMime) {
    const error = new Error('Unsupported image format. Allowed formats: JPEG, PNG, WebP');
    error.status = 400;
    throw error;
  }

  const sharp = await getSharp();

  if (sharp) {
    try {
      // 3. Process with sharp: validate, resize (max 500x500), optimize as WebP
      const pipeline = sharp(buffer, { failOn: 'error' })
        .resize({
          width: 500,
          height: 500,
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85, effort: 4 });

      const processedBuffer = await pipeline.toBuffer();
      return {
        profileImageData: processedBuffer.toString('base64'),
        profileImageMimeType: 'image/webp',
        sizeBytes: processedBuffer.length
      };
    } catch (err) {
      const error = new Error('Image processing failed or file is corrupted');
      error.status = 400;
      throw error;
    }
  }

  // Fallback when sharp native addon is unavailable: return validated raw image buffer
  return {
    profileImageData: buffer.toString('base64'),
    profileImageMimeType: detectedMime,
    sizeBytes: buffer.length
  };
}

/**
 * Parses and extracts Buffer from Base64 string, Data URI, or JSON payload.
 * @param {any} input 
 * @returns {Buffer}
 */
export function extractBufferFromBase64Payload(input) {
  if (!input) {
    const error = new Error('No image payload provided');
    error.status = 400;
    throw error;
  }

  let base64String = '';

  if (typeof input === 'string') {
    if (input.includes(';base64,')) {
      base64String = input.split(';base64,')[1];
    } else {
      base64String = input;
    }
  } else if (typeof input === 'object' && input !== null) {
    const raw = input.data || input.base64 || input.image || input.profileImage || input.profileImageData || '';
    if (typeof raw === 'string') {
      if (raw.includes(';base64,')) {
        base64String = raw.split(';base64,')[1];
      } else {
        base64String = raw;
      }
    }
  }

  if (!base64String) {
    const error = new Error('Invalid image payload structure');
    error.status = 400;
    throw error;
  }

  // Clean whitespace, convert URL-safe base64, and pad if needed
  let cleanBase64 = base64String.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (cleanBase64.length % 4 !== 0) {
    cleanBase64 += '=';
  }

  try {
    const buffer = Buffer.from(cleanBase64, 'base64');
    if (!buffer || buffer.length === 0) {
      const error = new Error('Empty image buffer after Base64 decoding');
      error.status = 400;
      throw error;
    }
    return buffer;
  } catch (e) {
    const error = new Error('Failed to decode Base64 data');
    error.status = 400;
    throw error;
  }
}
