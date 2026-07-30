import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import { AddressProvider } from "@/contexts/AddressContext";
import messages from "@/messages/en";
import DatesPage from "./page";

const DATES_RESPONSE = {
  dates: [
    { label: "General Election", category: "election_day", date: "2026-11-03", days_remaining: 10 },
    {
      label: "Registration deadline",
      category: "registration_deadline",
      date: "2026-10-01",
      days_remaining: -5,
    },
  ],
};

function renderDates() {
  return render(
    <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
      <AddressProvider>
        <DatesPage />
      </AddressProvider>
    </IntlProvider>
  );
}

describe("DatesPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("auto-fetches and renders date cards for the saved address", async () => {
    localStorage.setItem(
      "address",
      JSON.stringify({ street: "123 Main St", city: "Austin", state: "TX", zip: "78701" })
    );
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => DATES_RESPONSE,
    });
    vi.stubGlobal("fetch", fetchMock);

    renderDates();

    expect(await screen.findByText("General Election")).toBeInTheDocument();
    expect(screen.getByText("Registration deadline")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toContain(
      encodeURIComponent("123 Main St, Austin, TX 78701")
    );
  });

  it("submits the form manually and shows results", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => DATES_RESPONSE,
      })
    );

    renderDates();

    await user.type(screen.getByLabelText("Street Address"), "123 Main St");
    await user.type(screen.getByLabelText("City"), "Austin");
    await user.type(screen.getByLabelText("State"), "TX");
    await user.type(screen.getByLabelText("ZIP Code"), "78701");
    await user.click(screen.getByRole("button", { name: "Find My Dates" }));

    expect(await screen.findByText("General Election")).toBeInTheDocument();
  });

  it("shows a no-results message when the response has no dates", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ dates: [] }),
      })
    );

    renderDates();

    await user.type(screen.getByLabelText("Street Address"), "123 Main St");
    await user.type(screen.getByLabelText("City"), "Austin");
    await user.type(screen.getByLabelText("State"), "TX");
    await user.type(screen.getByLabelText("ZIP Code"), "78701");
    await user.click(screen.getByRole("button", { name: "Find My Dates" }));

    expect(
      await screen.findByText("No key dates found for this address yet.")
    ).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: "Upstream unavailable" }),
      })
    );

    renderDates();

    await user.type(screen.getByLabelText("Street Address"), "123 Main St");
    await user.type(screen.getByLabelText("City"), "Austin");
    await user.type(screen.getByLabelText("State"), "TX");
    await user.type(screen.getByLabelText("ZIP Code"), "78701");
    await user.click(screen.getByRole("button", { name: "Find My Dates" }));

    expect(await screen.findByText("Upstream unavailable")).toBeInTheDocument();
  });
});
