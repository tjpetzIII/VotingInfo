import { describe, it, expect, vi, beforeEach } from "vitest";

const createServerClient = vi.fn().mockReturnValue({ fake: "server-client" });
const cookieStore = {
  getAll: vi.fn(() => [{ name: "sb-token", value: "abc" }]),
  set: vi.fn(),
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

import { createClient } from "./server";

describe("supabase server client", () => {
  beforeEach(() => {
    createServerClient.mockClear();
    cookieStore.getAll.mockClear();
    cookieStore.set.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("creates a server client bound to the request's cookies", async () => {
    await createClient();

    expect(createServerClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
  });

  it("delegates getAll to the cookie store", async () => {
    await createClient();
    const { cookies } = createServerClient.mock.calls[0][2];

    const result = cookies.getAll();

    expect(result).toEqual([{ name: "sb-token", value: "abc" }]);
  });

  it("forwards setAll writes to the cookie store", async () => {
    await createClient();
    const { cookies } = createServerClient.mock.calls[0][2];

    cookies.setAll([{ name: "sb-token", value: "xyz", options: { path: "/" } }]);

    expect(cookieStore.set).toHaveBeenCalledWith("sb-token", "xyz", { path: "/" });
  });

  it("silently ignores errors from setAll (called from a Server Component)", async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error("cannot set cookies in a Server Component");
    });
    await createClient();
    const { cookies } = createServerClient.mock.calls[0][2];

    expect(() =>
      cookies.setAll([{ name: "sb-token", value: "xyz", options: {} }])
    ).not.toThrow();
  });
});
