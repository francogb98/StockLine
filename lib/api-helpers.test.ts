import { describe, it, expect } from "vitest";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

describe("api-helpers", () => {
  it("jsonResponse returns data with status and Content-Type", async () => {
    const data = { hello: "world" };
    const response = jsonResponse(data, 201);

    expect(response.status).toBe(201);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual(data);
  });

  it("errorResponse returns error payload and status", async () => {
    const response = errorResponse("Bad things", 400);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual({ error: "Bad things" });
  });
});
