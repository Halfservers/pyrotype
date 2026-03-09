export async function cacheGet(kv: KVNamespace, key: string): Promise<string | null> {
  return kv.get(`cache:${key}`)
}

export async function cacheSet(
  kv: KVNamespace,
  key: string,
  value: string,
  ttlSeconds = 300,
): Promise<void> {
  await kv.put(`cache:${key}`, value, { expirationTtl: ttlSeconds })
}

export async function cacheDel(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(`cache:${key}`)
}
