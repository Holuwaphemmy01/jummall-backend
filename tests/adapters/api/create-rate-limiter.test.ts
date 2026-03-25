import { describe, expect, it, jest } from "@jest/globals";
import type { Request, Response } from "express";

import { createRateLimiter } from "../../../src/infrastructure/api/middleware/create-rate-limiter";

function createRequest(ip = "127.0.0.1"): Request {
  return {
    ip,
    headers: {},
    socket: {
      remoteAddress: ip
    }
  } as Request;
}

function createResponse() {
  const headers = new Map<string, string>();

  const response = {
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };

  return {
    response: response as unknown as Response,
    headers,
    state: response
  };
}

describe("createRateLimiter", () => {
  it("allows requests within the configured limit", () => {
    let currentTime = 1_000;
    const limiter = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 2,
      now: () => currentTime
    });
    const req = createRequest();
    const { response, headers } = createResponse();
    const next = jest.fn();

    limiter(req, response, next);
    limiter(req, response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(headers.get("X-RateLimit-Limit")).toBe("2");
    expect(headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("blocks requests after the limit is exceeded", () => {
    let currentTime = 1_000;
    const limiter = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 1,
      message: "Rate limit hit.",
      now: () => currentTime
    });
    const req = createRequest();
    const { response, headers, state } = createResponse();
    const next = jest.fn();

    limiter(req, response, next);
    limiter(req, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(state.statusCode).toBe(429);
    expect(state.body).toEqual({
      message: "Rate limit hit."
    });
    expect(headers.get("Retry-After")).toBe("60");
  });

  it("resets the limit after the configured window elapses", () => {
    let currentTime = 1_000;
    const limiter = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 1,
      now: () => currentTime
    });
    const req = createRequest();
    const firstResponse = createResponse();
    const secondResponse = createResponse();
    const next = jest.fn();

    limiter(req, firstResponse.response, next);

    currentTime = 62_000;
    limiter(req, secondResponse.response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(secondResponse.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("uses the forwarded ip header when present", () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 1
    });
    const req = {
      ...createRequest("127.0.0.1"),
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1"
      }
    } as unknown as Request;
    const firstResponse = createResponse();
    const secondResponse = createResponse();
    const next = jest.fn();

    limiter(req, firstResponse.response, next);
    limiter(req, secondResponse.response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(secondResponse.state.statusCode).toBe(429);
  });
});
