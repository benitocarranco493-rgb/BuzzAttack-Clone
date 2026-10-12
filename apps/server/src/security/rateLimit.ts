/**
 * Limitador de eventos por socket (token bucket, AGENTS §9: ≈10 eventos/s).
 * Reentrante y testeable con reloj inyectado.
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillAt: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.lastRefillAt = now();
  }

  /** Consume un token si queda; false = hay que descartar el evento. */
  tryTake(): boolean {
    const current = this.now();
    const elapsedSeconds = Math.max(0, (current - this.lastRefillAt) / 1000);
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillPerSecond);
    this.lastRefillAt = current;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}
