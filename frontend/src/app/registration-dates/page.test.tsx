import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RegistrationDatesPage from "./page";

const PA_RESPONSE = {
  elections: [
    {
      election_name: "PA General Election",
      election_type: "general",
      election_date: "2026-11-03",
      polls_hours: "7am-8pm",
      registration_deadline: null,
      mail_in_deadline: null,
      state_code: "PA",
    },
  ],
  important_dates: [
    {
      event_date: "2026-10-01",
      event_description: "Voter registration deadline",
      election_year: 2026,
      state_code: "PA",
    },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RegistrationDatesPage />
    </QueryClientProvider>
  );
}

describe("RegistrationDatesPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens a state modal and shows its scraped data", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => PA_RESPONSE,
      })
    );

    renderPage();

    await user.click(screen.getByText("Pennsylvania"));

    expect(await screen.findByText("PA General Election")).toBeInTheDocument();
    expect(screen.getByText("Voter registration deadline")).toBeInTheDocument();
    expect(screen.getByText(/Data sourced from pa\.gov/)).toBeInTheDocument();
  });

  it("closes the modal", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => PA_RESPONSE,
      })
    );

    renderPage();
    await user.click(screen.getByText("Pennsylvania"));
    await screen.findByText("PA General Election");

    await user.click(screen.getByLabelText("Close"));

    expect(screen.queryByText("PA General Election")).not.toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: "Scraper data unavailable" }),
      })
    );

    renderPage();

    await user.click(screen.getByText("Alabama"));

    expect(await screen.findByText("Scraper data unavailable")).toBeInTheDocument();
  });

  it("shows a placeholder message when a state has no scraped data yet", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ elections: [], important_dates: [] }),
      })
    );

    renderPage();

    await user.click(screen.getByText("Alaska"));

    expect(
      await screen.findByText("No data available yet. Run the Alaska scraper to populate.")
    ).toBeInTheDocument();
  });
});
