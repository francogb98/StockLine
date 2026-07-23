import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

const CONFIG = { windowMs: 1000, maxRequests: 3 };

// Inline the module to isolate the Map between tests
// Since the Map is module-scoped, each test file run gets its own instance

describe("checkRateLimit", () => {
  it("allow first request", () => {
    const result = checkRateLimit("ip-1", CONFIG);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("allow requests within limit", () => {
    checkRateLimit("ip-2", CONFIG);
    checkRateLimit("ip-2", CONFIG);
    const result = checkRateLimit("ip-2", CONFIG);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("block when exceeding limit", () => {
    checkRateLimit("ip-3", CONFIG);
    checkRateLimit("ip-3", CONFIG);
    checkRateLimit("ip-3", CONFIG);
    const result = checkRateLimit("ip-3", CONFIG);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("track different keys independently", () => {
    checkRateLimit("alice", CONFIG);
    checkRateLimit("alice", CONFIG);

    const bobResult = checkRateLimit("bob", CONFIG);
    expect(bobResult.allowed).toBe(true);
    expect(bobResult.remaining).toBe(2);

    checkRateLimit("alice", CONFIG);
    const aliceResult = checkRateLimit("alice", CONFIG);
    expect(aliceResult.allowed).toBe(false);
  });

  it("reset after window expires", async () => {
    const shortConfig = { windowMs: 50, maxRequests: 1 };
    checkRateLimit("reset-key", shortConfig);
    const blocked = checkRateLimit("reset-key", shortConfig);
    expect(blocked.allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 60));

    const allowed = checkRateLimit("reset-key", shortConfig);
    expect(allowed.allowed).toBe(true);
  });
});
