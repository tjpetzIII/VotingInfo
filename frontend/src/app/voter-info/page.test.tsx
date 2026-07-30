import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { AddressProvider } from "@/contexts/AddressContext";
import messages from "@/messages/en";
import VoterInfoPage from "./page";

const VOTER_INFO = {
  election: { id: "1", name: "General Election", election_day: "2026-11-03" },
  polling_locations: [],
  contests: [],
};

const REGISTRATION = { available: true };

function renderPage() {
  render(
    <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
      <AddressProvider>
        <VoterInfoPage />
      </AddressProvider>
    </IntlProvider>
  );
}

describe("VoterInfoPage persistence across reload", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hydrates a saved address on a fresh mount (reload) and auto-fetches without form re-entry", async () => {
    // Simulates the address persisted from a previous session/reload.
    localStorage.setItem(
      "address",
      JSON.stringify({ street: "123 Main St", city: "Austin", state: "TX", zip: "78701" })
    );

    const fetchMock = vi.fn((url: string) => {
      const body = url.includes("/api/registration") ? REGISTRATION : VOTER_INFO;
      return Promise.resolve({ ok: true, status: 200, json: async () => body });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    // Results render solely from the persisted address — the user never re-submitted the form.
    expect(await screen.findByText("General Election")).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const calledAddresses = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(
      calledAddresses.every((u) => u.includes(encodeURIComponent("123 Main St, Austin, TX 78701")))
    ).toBe(true);
    // Both the voter-info and registration endpoints were driven by the saved address.
    expect(calledAddresses.some((u) => u.includes("/api/voter-info"))).toBe(true);
    expect(calledAddresses.some((u) => u.includes("/api/registration"))).toBe(true);
  });
});
