import { serverEnv } from '@/lib/env';

export function publicAppUrl(path: string, appUrl = serverEnv.appUrl) {
  return new URL(path, appUrl);
}
