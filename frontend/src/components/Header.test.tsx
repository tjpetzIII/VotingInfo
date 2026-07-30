import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import messages from "@/messages/en";

const { getAuthState, setAuthState } = vi.hoisted(() => {
  let state: { user: { email: string } | null; loading: boolean; signOut: () => void } = {
    user: null,
    loading: false,
    signOut: () => {},
  };
  return {
    getAuthState: () => state,
    setAuthState: (s: typeof state) => {
      state = s;
    },
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => getAuthState(),
}));

import Header from "./Header";

function renderHeader() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
        <Header />
      </IntlProvider>
    </QueryClientProvider>
  );
}

describe("Header", () => {
  beforeEach(() => {
    setAuthState({ user: null, loading: false, signOut: vi.fn() });
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

  it("shows a Sign In link when logged out", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login");
  });

  it("shows the user's email and a Sign Out button when logged in", async () => {
    const signOut = vi.fn();
    setAuthState({ user: { email: "voter@example.com" }, loading: false, signOut });
    const user = userEvent.setup();
    renderHeader();

    expect(screen.getByText("voter@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign Out" }));
    expect(signOut).toHaveBeenCalled();
  });

  it("hides the sample ballot link when there are no elections", async () => {
    renderHeader();
    await screen.findByRole("link", { name: "All Elections" });
    expect(screen.queryByRole("link", { name: "Sample Ballot" })).not.toBeInTheDocument();
  });

  it("shows the sample ballot link once elections are available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          elections: [{ id: "1", name: "General", election_day: "2026-11-03", ocd_division_id: null }],
        }),
      })
    );
    renderHeader();

    expect(await screen.findByRole("link", { name: "Sample Ballot" })).toHaveAttribute(
      "href",
      "/ballot"
    );
  });

  it("toggles the mobile menu", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));
    // Mobile menu duplicates the nav links; there should now be two "Voter Info" links.
    expect(screen.getAllByRole("link", { name: "Voter Info" }).length).toBe(2);
  });
});
