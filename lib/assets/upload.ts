import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { putAsset } from './storage';

const allowed = new Set(['image/jpeg', 'image/png', 'image/gif']);
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_EMAIL_WIDTH = 600;

function mimeFromSharpFormat(format?: string) {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'png') return 'image/png';
  if (format === 'gif') return 'image/gif';
  return '';
}

async function normalizeImage(buffer: Buffer, format: string, width?: number) {
  if (!width || width <= MAX_EMAIL_WIDTH) return buffer;

  const pipeline = sharp(buffer, { animated: format === 'gif' }).resize({ width: MAX_EMAIL_WIDTH, withoutEnlargement: true });
  if (format === 'jpeg') return pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  if (format === 'png') return pipeline.png({ compressionLevel: 9 }).toBuffer();
  if (format === 'gif') return pipeline.gif().toBuffer();
  return buffer;
}

export async function validateAndUpload(file: File) {
  const input = Buffer.from(await file.arrayBuffer());
  if (input.length > MAX_BYTES) throw new Error('Datei ist größer als 10 MB.');

  const inputMetadata = await sharp(input, { animated: true }).metadata();
  const mimeType = mimeFromSharpFormat(inputMetadata.format);
  if (!allowed.has(mimeType)) throw new Error('Nur JPEG, PNG und GIF sind erlaubt.');
  if (!inputMetadata.width || !inputMetadata.height) throw new Error('Bilddimensionen konnten nicht gelesen werden.');

  const output = await normalizeImage(input, inputMetadata.format!, inputMetadata.width);
  const outputMetadata = await sharp(output, { animated: true }).metadata();
  const key = `${nanoid()}-${file.name.replace(/[^a-z0-9._-]/gi, '-')}`;
  const publicUrl = await putAsset(key, output, mimeType);

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
