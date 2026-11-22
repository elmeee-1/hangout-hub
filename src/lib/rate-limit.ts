type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Very small in-memory rate limiter, enough to stop OTP spam in a
 * faculty-scale deployment. Swap for Redis if you scale out.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function otpRateKey(channel: string, target: string, ip: string): string {
  return "otp:" + channel + ":" + target.toLowerCase() + ":" + ip;
}
