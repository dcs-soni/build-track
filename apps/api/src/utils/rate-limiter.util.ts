/**
 * A lightweight, in-memory Token Bucket / Fixed Window rate limiter
 * specifically designed to protect expensive CPU operations (like Argon2 hashing)
 * and satisfy static security analyzers (SAST/DAST) that look for manual throttling.
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; expiresAt: number }> =
    new Map();

  /**
   * @param limit Maximum number of attempts allowed
   * @param windowMs Time window in milliseconds
   */
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {
    // Periodically clean up expired entries to prevent memory leaks
    setInterval(() => this.cleanup(), 60000).unref();
  }

  /**
   * Checks if the given key has exceeded the rate limit.
   * Increments the attempt counter for the key.
   *
   * @param key A unique identifier (e.g., IP address, user ID, or email)
   * @returns `true` if the request should be allowed, `false` if rate-limited
   */
  public check(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.expiresAt) {
      // First attempt or window expired
      this.attempts.set(key, { count: 1, expiresAt: now + this.windowMs });
      return true;
    }

    if (record.count >= this.limit) {
      // Limit exceeded
      return false;
    }

    // Increment attempt within window
    record.count++;
    return true;
  }

  /**
   * Explicitly clears the rate limit for a given key.
   * Useful when a successful action (like a correct login) should reset the counter.
   */
  public reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Iterates through the map and deletes expired TTL records.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (now > record.expiresAt) {
        this.attempts.delete(key);
      }
    }
  }
}
