// @vitest-environment node

import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { UPLOAD_LIMITS, validateAndUpload } from '@/lib/assets/upload';

async function imageFile(format: 'gif' | 'jpeg' | 'png', width: number, height: number, name = `image.${format}`) {
  const image = sharp({ create: { width, height, channels: 3, background: '#ffffff' } });
  const buffer = await image[format]().toBuffer();
  return new File([Uint8Array.from(buffer)], name, { type: `image/${format === 'jpeg' ? 'jpeg' : format}` });
}

function fakeUploader() {
  return vi.fn(async (key: string) => `https://assets.example.com/newsletter-assets/${key}`);
}

describe('asset upload validation', () => {
  it('rejects files above the configured byte limit', async () => {
    const file = new File([new Uint8Array(UPLOAD_LIMITS.maxBytes + 1)], 'large.png', { type: 'image/png' });

    await expect(validateAndUpload(file, fakeUploader())).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('rejects unsupported image formats', async () => {
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" />'], 'icon.svg', {
      type: 'image/svg+xml',
    });

    await expect(validateAndUpload(file, fakeUploader())).rejects.toMatchObject({ code: 'UNSUPPORTED_FORMAT' });
  });

  it('rejects images above the configured width or height', async () => {
    const file = await imageFile('png', UPLOAD_LIMITS.maxWidth + 1, 10, 'too-wide.png');

    await expect(validateAndUpload(file, fakeUploader())).rejects.toMatchObject({ code: 'IMAGE_DIMENSIONS_TOO_LARGE' });
  });

  it('rejects images above the configured pixel count', async () => {
    const file = await imageFile('png', 3000, 3000, 'too-many-pixels.png');

    await expect(validateAndUpload(file, fakeUploader())).rejects.toMatchObject({ code: 'IMAGE_PIXELS_TOO_LARGE' });
  });

  it.each(['jpeg', 'png', 'gif'] as const)('accepts and uploads valid %s images', async (format) => {
    const uploader = fakeUploader();
    const file = await imageFile(format, 800, 400);

    const result = await validateAndUpload(file, uploader);

    expect(result.mimeType).toBe(`image/${format === 'jpeg' ? 'jpeg' : format}`);
    expect(result.width).toBe(UPLOAD_LIMITS.maxEmailWidth);
    expect(result.publicUrl).toContain('https://assets.example.com/newsletter-assets/');
    expect(uploader).toHaveBeenCalledOnce();
  });
});
