import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  }),
}));

import RootLayout from "./layout";

describe("RootLayout", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ elections: [] }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the header, page content, and footer", async () => {
    render(
      <RootLayout>
        <p>Page content</p>
      </RootLayout>
    );

    expect(screen.getByText("VoteReady")).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(await screen.findByText(/VoteReady\. Empowering voters everywhere\./)).toBeInTheDocument();
  });
});
