import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import { AddressProvider } from "@/contexts/AddressContext";
import messages from "@/messages/en";

const { getSearch, setSearch, getParams, setParams } = vi.hoisted(() => {
  let search = "";
  let params: Record<string, string> = {};
  return {
    getSearch: () => search,
    setSearch: (s: string) => {
      search = s;
    },
    getParams: () => params,
    setParams: (p: Record<string, string>) => {
      params = p;
    },
  };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(getSearch()),
  useParams: () => getParams(),
}));

import ContestPage from "./page";

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

function renderContest() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
        <AddressProvider>
          <ContestPage />
        </AddressProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
}

describe("ContestPage (elections detail)", () => {
  beforeEach(() => {
    localStorage.clear();
    setSearch("");
    setParams({ contestId: "5" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a no-address message when there is no address available", () => {
    renderContest();

    expect(screen.getByText("No address provided.")).toBeInTheDocument();
  });

  it("renders the matching contest's candidates", async () => {
    setSearch("address=123+Main+St%2C+Austin%2C+TX+78701");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ELECTIONS_RESPONSE,
      })
    );

    renderContest();

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Governor")).toBeInTheDocument();
  });

  it("shows a not-found message for a contest id that doesn't match", async () => {
    setSearch("address=123+Main+St%2C+Austin%2C+TX+78701");
    setParams({ contestId: "999" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ELECTIONS_RESPONSE,
      })
    );

    renderContest();

    expect(await screen.findByText("Contest not found.")).toBeInTheDocument();
  });
});
