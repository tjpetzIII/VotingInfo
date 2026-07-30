import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { AddressProvider } from "@/contexts/AddressContext";
import messages from "@/messages/en";
import PollingPage from "./page";

// PollingMap pulls in leaflet (browser-only); stub it so the test can render results.
vi.mock("@/components/PollingMap", () => ({
  default: () => <div data-testid="polling-map" />,
}));

const VOTER_INFO = {
  election: { id: "1", name: "General Election", election_day: "2026-11-03" },
  polling_locations: [
    { name: "City Hall", address: "1 Center Plaza", hours: "7am-8pm", location_name: "City Hall" },
  ],
  contests: [],
};

function renderPolling() {
  render(
    <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
      <AddressProvider>
        <PollingPage />
      </AddressProvider>
    </IntlProvider>
  );
}

describe("PollingPage auto-fetch from saved address", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("automatically fetches and renders results for a saved address without form re-entry", async () => {
    localStorage.setItem(
      "address",
      JSON.stringify({ street: "123 Main St", city: "Austin", state: "TX", zip: "78701" })
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => VOTER_INFO,
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPolling();

    // Results appear driven purely by the saved address — the user never submitted the form.
    expect(await screen.findByText("General Election")).toBeInTheDocument();
    expect(screen.getByText("City Hall")).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const requestedUrl = fetchMock.mock.calls[0][0] as string;
    expect(requestedUrl).toContain(encodeURIComponent("123 Main St, Austin, TX 78701"));
  });
});
