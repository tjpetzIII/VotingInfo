import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import { AddressProvider } from "@/contexts/AddressContext";
import messages from "@/messages/en";

const { getSearch, setSearch } = vi.hoisted(() => {
  let search = "";
  return {
    getSearch: () => search,
    setSearch: (s: string) => {
      search = s;
    },
  };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(getSearch()),
}));

import ElectionsPage from "./page";

const ELECTIONS_RESPONSE = {
  election: { id: "1", name: "General Election", election_day: "2026-11-03" },
  contests: [
    {
      id: 5,
      office: "Governor",
      district: null,
      candidates: [
        {
          name: "Jane Doe",
          party: "Independent",
          candidate_url: null,
          photo_url: null,
          phone: null,
          email: null,
          channels: [],
        },
      ],
    },
  ],
};

function renderElections() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
        <AddressProvider>
          <ElectionsPage />
        </AddressProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
}

describe("ElectionsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    setSearch("");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches and renders contests when an ?address= param is present", async () => {
    setSearch("address=123+Main+St%2C+Austin%2C+TX+78701");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ELECTIONS_RESPONSE,
      })
    );

    renderElections();

    expect(await screen.findByText("Governor")).toBeInTheDocument();
    expect(screen.getByText("General Election")).toBeInTheDocument();
  });

  it("auto-fetches from the saved address when there is no URL param", async () => {
    localStorage.setItem(
      "address",
      JSON.stringify({ street: "123 Main St", city: "Austin", state: "TX", zip: "78701" })
    );
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ELECTIONS_RESPONSE,
    });
    vi.stubGlobal("fetch", fetchMock);

    renderElections();

    expect(await screen.findByText("Governor")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toContain(
      encodeURIComponent("123 Main St, Austin, TX 78701")
    );
  });

  it("shows a not-found message when there are no contests", async () => {
    setSearch("address=999+Nowhere+Ave%2C+Austin%2C+TX+78701");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ...ELECTIONS_RESPONSE, contests: [] }),
      })
    );

    renderElections();

    expect(await screen.findByText("No contests found for this address.")).toBeInTheDocument();
  });

  it("shows the error message on a failed fetch", async () => {
    setSearch("address=bad");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      })
    );

    renderElections();

    expect(
      await screen.findByText("No election data found for this address.")
    ).toBeInTheDocument();
  });

  it("submits the manual search form and updates the query", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ELECTIONS_RESPONSE,
    });
    vi.stubGlobal("fetch", fetchMock);

    renderElections();

    await user.type(
      screen.getByPlaceholderText("e.g. 123 Main St, Austin, TX 78701"),
      "123 Main St, Austin, TX 78701"
    );
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Governor")).toBeInTheDocument();
  });
});
