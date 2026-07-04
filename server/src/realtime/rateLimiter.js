/**
 * Small token-bucket limiter, one bucket per socket. Generous enough for
 * fast typing + throttled cursor traffic, tight enough to stop floods.
 */
export class TokenBucket {
  constructor({ capacity = 120, refillPerSecond = 60 } = {}) {
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.violations = 0;
  }

  /** @returns {boolean} whether the event should be allowed */
  consume(cost = 1) {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillPerSecond
    );
    this.lastRefill = now;

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    this.violations += 1;
    return false;
  }

  /** A socket this far over the limit is hostile — disconnect it. */
  get abusive() {
    return this.violations > 500;
  }
}
