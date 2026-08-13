import { afterEach, describe, expect, it, vi } from "vitest";
import { log } from "@/lib/logger";

vi.mock("@/lib/error-reporter", () => ({
  reportError: vi.fn().mockResolvedValue({}),
}));

import { reportError } from "@/lib/error-reporter";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("log", () => {
  it("writes to stdout for info/warn without calling reportError", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    log("info", "user logged in", { actorId: "user-1" });
    log("warn", "rate limit close", { ip: "1.2.3.4" });

    expect(stdoutSpy).toHaveBeenCalled();
    expect(stderrSpy).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("writes to stderr AND triggers reportError for error", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    log("error", "db connection failed", { host: "db" });

    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(stderrSpy).toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledOnce();
    const arg = vi.mocked(reportError).mock.calls[0][0];
    expect(arg.severity).toBe("ERROR");
    expect(arg.message).toBe("db connection failed");
    expect(arg.metadata).toEqual({ host: "db" });
  });

  it("writes to stderr AND triggers reportError for critical with severity=CRITICAL", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    log("critical", "system down", { code: "FATAL" });

    expect(stderrSpy).toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledOnce();
    const arg = vi.mocked(reportError).mock.calls[0][0];
    expect(arg.severity).toBe("CRITICAL");
  });

  it("never throws if reportError rejects", async () => {
    vi.mocked(reportError).mockRejectedValue(new Error("downstream fail"));
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    expect(() => log("error", "x")).not.toThrow();
    expect(stderrSpy).toHaveBeenCalled();

    await new Promise((r) => setImmediate(r));
  });
});
