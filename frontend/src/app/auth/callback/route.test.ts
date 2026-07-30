import { describe, it, expect, vi, beforeEach } from "vitest";

const exchangeCodeForSession = vi.fn().mockResolvedValue({ data: {}, error: null });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession },
  })),
}));

import { GET } from "./route";

describe("GET /auth/callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockClear();
  });

  it("exchanges the code for a session and redirects to the origin", async () => {
    const request = new Request("http://localhost:3000/auth/callback?code=abc123");

    const response = await GET(request);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects without exchanging when no code is present", async () => {
    const request = new Request("http://localhost:3000/auth/callback");

    const response = await GET(request);

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
