/**
 * A simple in-memory TTL (Time-To-Live) cache.
 * Useful for caching hot database rows (like User profiles or Tenant configurations)
 * to prevent DoS via rapid polling or excessive DB load.
 */
export class TTLCache<T> {
  private store: Map<string, { value: T; expiresAt: number }> = new Map();

  /**
   * @param ttlMs Time-to-live for cached items in milliseconds
   */
  constructor(private readonly ttlMs: number) {
    // Periodically clean up expired entries
    setInterval(() => this.cleanup(), Math.max(60000, ttlMs)).unref();
  }

  /**
   * Retrieves a value from the cache if it exists and hasn't expired.
   */
  public get(key: string): T | undefined {
    const record = this.store.get(key);
    if (!record) return undefined;

    if (Date.now() > record.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return record.value;
  }

  /**
   * Stores a value securely in the cache until the TTL expires.
   */
  public set(key: string, value: T): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Explicitly removes a key from the cache.
   */
  public delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Iterates through the map and deletes expired TTL records.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}
