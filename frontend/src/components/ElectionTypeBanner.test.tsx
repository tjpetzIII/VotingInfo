import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import messages from "@/messages/en";
import ElectionTypeBanner from "./ElectionTypeBanner";

function renderBanner(election: { id: string; name: string }) {
  return render(
    <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
      <ElectionTypeBanner election={election} />
    </IntlProvider>
  );
}

describe("ElectionTypeBanner", () => {
  it("shows the general election explanation", () => {
    renderBanner({ id: "1", name: "2026 General Election" });
    expect(screen.getByText(messages["electionType.general.title"])).toBeInTheDocument();
    expect(screen.getByText(messages["electionType.general.explanation"])).toBeInTheDocument();
  });

  it("shows the primary election explanation", () => {
    renderBanner({ id: "2", name: "2026 Primary Election" });
    expect(screen.getByText(messages["electionType.primary.title"])).toBeInTheDocument();
    expect(screen.getByText(messages["electionType.primary.explanation"])).toBeInTheDocument();
  });

  it("shows the special election explanation", () => {
    renderBanner({ id: "3", name: "November 2026 Special Election" });
    expect(screen.getByText(messages["electionType.special.title"])).toBeInTheDocument();
    expect(screen.getByText(messages["electionType.special.explanation"])).toBeInTheDocument();
  });

  it("shows the runoff election explanation", () => {
    renderBanner({ id: "4", name: "2026 Runoff Election" });
    expect(screen.getByText(messages["electionType.runoff.title"])).toBeInTheDocument();
    expect(screen.getByText(messages["electionType.runoff.explanation"])).toBeInTheDocument();
  });

  it("falls back to the generic explanation for an unrecognized name", () => {
    renderBanner({ id: "5", name: "City Council Municipal Election" });
    expect(screen.getByText(messages["electionType.generic.title"])).toBeInTheDocument();
    expect(screen.getByText(messages["electionType.generic.explanation"])).toBeInTheDocument();
  });

  it("collapses and expands the explanation on toggle", async () => {
    const user = userEvent.setup();
    renderBanner({ id: "1", name: "2026 General Election" });
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(messages["electionType.general.explanation"])).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(messages["electionType.general.explanation"])).not.toBeInTheDocument();
    // Title stays visible even when collapsed.
    expect(screen.getByText(messages["electionType.general.title"])).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(messages["electionType.general.explanation"])).toBeInTheDocument();
  });

  it("resets to expanded when the election changes", async () => {
    const user = userEvent.setup();
    const { rerender } = renderBanner({ id: "1", name: "2026 General Election" });
    const toggle = screen.getByRole("button");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    rerender(
      <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
        <ElectionTypeBanner election={{ id: "2", name: "2026 Primary Election" }} />
      </IntlProvider>
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(messages["electionType.primary.explanation"])).toBeInTheDocument();
  });
});
