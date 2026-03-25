import type { Request, RequestHandler, Response } from "express";

interface RateLimitState {
  count: number;
  resetTime: number;
}

export interface CreateRateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
  now?: () => number;
}

function getClientKey(req: Request): string {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket.remoteAddress || "anonymous";
}

function setRateLimitHeaders(
  res: Response,
  maxRequests: number,
  remaining: number,
  resetTime: number
) {
  res.setHeader("X-RateLimit-Limit", String(maxRequests));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(remaining, 0)));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetTime / 1000)));
}

export function createRateLimiter({
  windowMs,
  maxRequests,
  message = "Too many requests. Please try again later.",
  statusCode = 429,
  keyGenerator = getClientKey,
  now = () => Date.now()
}: CreateRateLimiterOptions): RequestHandler {
  const store = new Map<string, RateLimitState>();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const currentTime = now();
    const existingEntry = store.get(key);

    if (!existingEntry || currentTime >= existingEntry.resetTime) {
      store.set(key, {
        count: 1,
        resetTime: currentTime + windowMs
      });

      setRateLimitHeaders(res, maxRequests, maxRequests - 1, currentTime + windowMs);
      next();
      return;
    }

    existingEntry.count += 1;
    store.set(key, existingEntry);

    const remaining = maxRequests - existingEntry.count;
    setRateLimitHeaders(res, maxRequests, remaining, existingEntry.resetTime);

    if (existingEntry.count > maxRequests) {
      const retryAfterSeconds = Math.ceil(
        (existingEntry.resetTime - currentTime) / 1000
      );

      res.setHeader("Retry-After", String(Math.max(retryAfterSeconds, 0)));
      res.status(statusCode).json({
        message
      });
      return;
    }

    next();
  };
}
