import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

import BallotPage from "./page";

const BALLOT_RESPONSE = {
  election: { id: "1", name: "General Election", election_day: "2026-11-03" },
  contests: [
    {
      id: 1,
      office: "President",
      district: null,
      level: "federal",
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
    {
      id: 2,
      office: "Governor",
      district: null,
      level: "state",
      candidates: [],
    },
  ],
};

function renderBallot() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
        <AddressProvider>
          <BallotPage />
        </AddressProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
}

describe("BallotPage", () => {
  beforeEach(() => {
    localStorage.clear();
    setSearch("");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("groups contests by level once fetched", async () => {
    setSearch("address=123+Main+St%2C+Austin%2C+TX+78701");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => BALLOT_RESPONSE,
      })
    );

    renderBallot();

    expect(await screen.findByText("Federal")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "State" })).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("No candidates found")).toBeInTheDocument();
  });

  it("collapses and expands a section on toggle", async () => {
    const user = userEvent.setup();
    setSearch("address=123+Main+St%2C+Austin%2C+TX+78701");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => BALLOT_RESPONSE,
      })
    );

    renderBallot();

    await screen.findByText("Jane Doe");
    const federalToggle = screen.getByRole("button", { name: "Toggle Federal section" });
    await user.click(federalToggle);

    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();

    await user.click(federalToggle);
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
  });

  it("auto-fetches from the saved address", async () => {
    localStorage.setItem(
      "address",
      JSON.stringify({ street: "123 Main St", city: "Austin", state: "TX", zip: "78701" })
    );
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => BALLOT_RESPONSE,
    });
    vi.stubGlobal("fetch", fetchMock);

    renderBallot();

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
  });

  it("shows the empty-ballot message when there are no contests", async () => {
    setSearch("address=123+Main+St%2C+Austin%2C+TX+78701");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ...BALLOT_RESPONSE, contests: [] }),
      })
    );

    renderBallot();

    expect(
      await screen.findByText("No sample ballot is available for this address yet.")
    ).toBeInTheDocument();
  });
});
