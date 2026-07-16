import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { putAsset } from './storage';

const allowed = new Set(['image/jpeg', 'image/png', 'image/gif']);

export const UPLOAD_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxWidth: 4000,
  maxHeight: 4000,
  maxPixels: 8_000_000,
  maxEmailWidth: 600,
} as const;

export type UploadErrorCode =
  | 'FILE_TOO_LARGE'
  | 'IMAGE_DIMENSIONS_TOO_LARGE'
  | 'IMAGE_PIXELS_TOO_LARGE'
  | 'INVALID_IMAGE'
  | 'UNSUPPORTED_FORMAT';

export class UploadValidationError extends Error {
  constructor(
    public readonly code: UploadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

type AssetUploader = (key: string, body: Buffer, mimeType: string) => Promise<string>;

function mimeFromSharpFormat(format?: string) {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'png') return 'image/png';
  if (format === 'gif') return 'image/gif';
  return '';
}

function assertImageDimensions(width: number, height: number, frameCount: number) {
  if (width > UPLOAD_LIMITS.maxWidth || height > UPLOAD_LIMITS.maxHeight) {
    throw new UploadValidationError(
      'IMAGE_DIMENSIONS_TOO_LARGE',
      `Bild darf maximal ${UPLOAD_LIMITS.maxWidth}×${UPLOAD_LIMITS.maxHeight} Pixel groß sein.`,
    );
  }

  if (width * height * frameCount > UPLOAD_LIMITS.maxPixels) {
    throw new UploadValidationError(
      'IMAGE_PIXELS_TOO_LARGE',
      `Bild darf maximal ${UPLOAD_LIMITS.maxPixels.toLocaleString('de-DE')} Pixel enthalten.`,
    );
  }
}

async function normalizeImage(buffer: Buffer, format: string, width?: number) {
  if (!width || width <= UPLOAD_LIMITS.maxEmailWidth) return buffer;

  const pipeline = sharp(buffer, { animated: format === 'gif' }).resize({
    width: UPLOAD_LIMITS.maxEmailWidth,
    withoutEnlargement: true,
  });
  if (format === 'jpeg') return pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  if (format === 'png') return pipeline.png({ compressionLevel: 9 }).toBuffer();
  if (format === 'gif') return pipeline.gif().toBuffer();
  return buffer;
}

export async function validateAndUpload(file: File, upload: AssetUploader = putAsset) {
  const input = Buffer.from(await file.arrayBuffer());
  if (input.length > UPLOAD_LIMITS.maxBytes)
    throw new UploadValidationError('FILE_TOO_LARGE', 'Datei ist größer als 10 MB.');

  let inputMetadata: sharp.Metadata;
  try {
    inputMetadata = await sharp(input, { animated: true }).metadata();
  } catch {
    throw new UploadValidationError('INVALID_IMAGE', 'Bilddatei konnte nicht gelesen werden.');
  }

  const mimeType = mimeFromSharpFormat(inputMetadata.format);
  if (!allowed.has(mimeType))
    throw new UploadValidationError('UNSUPPORTED_FORMAT', 'Nur JPEG, PNG und GIF sind erlaubt.');
  if (!inputMetadata.width || !inputMetadata.height)
    throw new UploadValidationError('INVALID_IMAGE', 'Bilddimensionen konnten nicht gelesen werden.');
  assertImageDimensions(inputMetadata.width, inputMetadata.height, inputMetadata.pages ?? 1);

  const output = await normalizeImage(input, inputMetadata.format!, inputMetadata.width);
  const outputMetadata = await sharp(output, { animated: true }).metadata();
  const key = `${nanoid()}-${file.name.replace(/[^a-z0-9._-]/gi, '-')}`;
  const publicUrl = await upload(key, output, mimeType);

  return {
    storageKey: key,
    publicUrl,
    originalFilename: file.name,
    mimeType,
    width: outputMetadata.width || inputMetadata.width,
    height: outputMetadata.height || inputMetadata.height,
    sizeBytes: output.length,
  };
}
