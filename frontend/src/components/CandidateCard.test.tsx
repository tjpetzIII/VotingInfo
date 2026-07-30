import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import messages from "@/messages/en";
import CandidateCard from "./CandidateCard";
import type { CandidateDetail } from "@/lib/api";

const BASE: CandidateDetail = {
  name: "Jane Doe",
  party: "Democratic Party",
  candidate_url: "https://example.com/jane/",
  photo_url: null,
  phone: "555-1234",
  email: "jane@example.com",
  channels: [
    { channel_type: "Twitter", id: "@janedoe" },
    { channel_type: "Unsupported", id: "abc" },
  ],
};

function renderCard(candidate: CandidateDetail) {
  return render(
    <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
      <CandidateCard candidate={candidate} />
    </IntlProvider>
  );
}

describe("CandidateCard", () => {
  it("renders the name, party badge, website, and known social channels", () => {
    renderCard(BASE);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Democratic Party")).toBeInTheDocument();
    expect(screen.getByText("example.com/jane")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute(
      "href",
      "https://twitter.com/janedoe"
    );
    // The unsupported channel type has no config and is silently skipped.
    expect(screen.queryByText("abc")).not.toBeInTheDocument();
  });

  it("falls back to initials when there is no photo", () => {
    renderCard(BASE);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("toggles collapsible contact info", async () => {
    const user = userEvent.setup();
    renderCard(BASE);

    expect(screen.queryByText("555-1234")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Contact info/ }));

    expect(screen.getByText("555-1234")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Contact info/ }));
    expect(screen.queryByText("555-1234")).not.toBeInTheDocument();
  });

  it("hides the contact-info toggle when there is no phone or email", () => {
    renderCard({ ...BASE, phone: null, email: null });
    expect(screen.queryByRole("button", { name: /Contact info/ })).not.toBeInTheDocument();
  });

  it("renders nothing extra when there is no website or channels", () => {
    renderCard({ ...BASE, candidate_url: null, channels: [] });
    expect(screen.queryByText("example.com/jane")).not.toBeInTheDocument();
  });
});
