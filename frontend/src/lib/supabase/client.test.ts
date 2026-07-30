import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createBrowserClient = vi.fn().mockReturnValue({ fake: "client" });

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => createBrowserClient(...args),
}));

import { createClient } from "./client";

describe("supabase browser client", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    createBrowserClient.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  it("creates a browser client using the public env vars", () => {
    const client = createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "anon-key"
    );
    expect(client).toEqual({ fake: "client" });
  });
});
