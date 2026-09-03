export function assetListFromPayload<T>(payload: T[] | { assets?: T[] }): T[] {
  return Array.isArray(payload) ? payload : (payload.assets ?? []);
}
