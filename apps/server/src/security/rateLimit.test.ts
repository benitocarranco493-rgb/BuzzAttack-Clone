import { describe, expect, it } from 'vitest';

import { TokenBucketRateLimiter } from './rateLimit.js';

describe('TokenBucketRateLimiter', () => {
  it('deja pasar `capacity` eventos seguidos y bloquea el resto', () => {
    const now = () => 0;
    const limiter = new TokenBucketRateLimiter(3, 1, now);
    expect(limiter.tryTake()).toBe(true);
    expect(limiter.tryTake()).toBe(true);
    expect(limiter.tryTake()).toBe(true);
    expect(limiter.tryTake()).toBe(false);
  });

  it('recarga tokens con el paso del tiempo', () => {
    let timestamp = 0;
    const limiter = new TokenBucketRateLimiter(2, 1, () => timestamp); // 1 token/s
    expect(limiter.tryTake()).toBe(true);
    expect(limiter.tryTake()).toBe(true);
    expect(limiter.tryTake()).toBe(false);

    timestamp += 1000;
    expect(limiter.tryTake()).toBe(true);
    expect(limiter.tryTake()).toBe(false);
  });

  it('nunca acumula más tokens que su capacidad', () => {
    let timestamp = 0;
    const limiter = new TokenBucketRateLimiter(2, 1, () => timestamp);
    expect(limiter.tryTake()).toBe(true); // queda 1
    timestamp += 60_000; // sin el tope serían 61 tokens
    expect(limiter.tryTake()).toBe(true);
    expect(limiter.tryTake()).toBe(true);
    expect(limiter.tryTake()).toBe(false); // tope de 2 tokens
  });
});
