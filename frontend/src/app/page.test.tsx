import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import messages from "@/messages/en";
import Home from "./page";

function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
        <Home />
      </IntlProvider>
    </QueryClientProvider>
  );
}

describe("Home page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the list of elections once loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          elections: [
            {
              id: "1",
              name: "2026 General Election",
              election_day: "2026-11-03",
              ocd_division_id: "ocd-division/country:us/state:tx",
            },
          ],
        }),
      })
    );

    renderHome();

    expect(await screen.findByText("2026 General Election")).toBeInTheDocument();
    expect(screen.getByText("2026-11-03")).toBeInTheDocument();
    expect(screen.getByText("Texas")).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: "Upstream unavailable" }),
      })
    );

    renderHome();

    expect(await screen.findByText("Upstream unavailable")).toBeInTheDocument();
  });

  it("opens and closes the election detail modal", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          elections: [
            {
              id: "42",
              name: "Special Election",
              election_day: "2026-05-01",
              ocd_division_id: null,
            },
          ],
        }),
      })
    );

    renderHome();

    await user.click(await screen.findByText("Special Election"));

    expect(screen.getByText("Election ID")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Close"));

    expect(screen.queryByText("Election ID")).not.toBeInTheDocument();
  });
});
