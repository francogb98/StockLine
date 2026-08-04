import { describe, it, expect, vi, afterEach } from "vitest";
import * as apiAuth from "@/lib/api-auth";
import * as testUsers from "@/lib/test-users";
import * as cloudinaryService from "@/lib/cloudinary/image-service";
import { POST } from "./route";

vi.mock("@/lib/cloudinary/image-service", () => ({
  uploadImage: vi.fn(),
}));

const tenantUser = {
  id: "user-1",
  email: "admin@store.com",
  name: "Admin",
  role: "admin",
  storeId: "store-1",
};

function makeRequest(file?: File): Request {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://localhost/api/products/image", {
    method: "POST",
    body: form,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/products/image", () => {
  it("returns 401 when not authenticated", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    });

    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const response = await POST(makeRequest());
    expect(response.status).toBe(400);
  });

  it("returns 400 for a non-image file", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const file = new File(["data"], "nota.txt", { type: "text/plain" });
    const response = await POST(makeRequest(file));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/imagen/i);
  });

  it("returns 400 for an image over 5MB", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    const response = await POST(makeRequest(file));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/5 MB/i);
  });

  it("simulates upload for test users without Cloudinary", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: { ...tenantUser, email: "admin@techmart.com" },
    });
    vi.spyOn(testUsers, "isTestUserEmail").mockReturnValue(true);

    const file = new File([new Uint8Array([1, 2, 3])], "img.png", {
      type: "image/png",
    });
    const response = await POST(makeRequest(file));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.imageUrl).toContain("data:image/svg+xml");
    expect(data.cloudinaryPublicId).toMatch(/^demo-/);
    expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
  });

  it("uploads a valid image and returns url + publicId", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(testUsers, "isTestUserEmail").mockReturnValue(false);
    vi.mocked(cloudinaryService.uploadImage).mockResolvedValue({
      imageUrl: "https://res.cloudinary.com/x/image/upload/products/abc.png",
      cloudinaryPublicId: "products/abc",
    });

    const file = new File([new Uint8Array([1, 2, 3])], "img.png", {
      type: "image/png",
    });
    const response = await POST(makeRequest(file));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.imageUrl).toContain("res.cloudinary.com");
    expect(data.cloudinaryPublicId).toBe("products/abc");
    expect(cloudinaryService.uploadImage).toHaveBeenCalledTimes(1);
    expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/png;base64,/),
    );
  });
});
