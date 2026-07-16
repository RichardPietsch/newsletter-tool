import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { serverEnv } from '@/lib/env';

export const s3 = new S3Client({
  region: serverEnv.s3.region,
  endpoint: serverEnv.s3.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: serverEnv.s3.accessKeyId,
    secretAccessKey: serverEnv.s3.secretAccessKey,
  },
});

export async function putAsset(key: string, body: Buffer, mimeType: string) {
  await s3.send(new PutObjectCommand({ Bucket: serverEnv.s3.bucket, Key: key, Body: body, ContentType: mimeType }));
  return `${serverEnv.s3.publicAssetBaseUrl}/${key}`;
}
