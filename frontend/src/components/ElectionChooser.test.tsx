import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import messages from "@/messages/en";

const mockUseElection = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/ElectionContext", () => ({ useElection: mockUseElection }));

import ElectionChooser from "./ElectionChooser";

function renderChooser(value: Partial<ReturnType<typeof mockUseElection>>) {
  mockUseElection.mockReturnValue({
    choices: [],
    electionId: null,
    setElectionId: vi.fn(),
    selectionRequired: false,
    isLoading: false,
    error: null,
    ...value,
  });
  return render(
    <IntlProvider locale="en" messages={messages}>
      <ElectionChooser />
    </IntlProvider>
  );
}

describe("ElectionChooser", () => {
  it("shows an actionable empty state", () => {
    renderChooser({});
    expect(screen.getByRole("status")).toHaveTextContent("No elections were found");
  });

  it("hides itself for one unambiguous election", () => {
    renderChooser({ choices: [{ id: "1", name: "General", election_day: "2026-11-03" }] });
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("supports keyboard selection for an ambiguous list", async () => {
    const setElectionId = vi.fn();
    const user = userEvent.setup();
    renderChooser({
      choices: [
        { id: "1", name: "Primary", election_day: "2026-05-19" },
        { id: "2", name: "General", election_day: "2026-11-03" },
      ],
      selectionRequired: true,
      setElectionId,
    });

    const radios = screen.getAllByRole("radio");
    await user.tab();
    await user.keyboard(" ");
    expect(radios[0]).toHaveFocus();
    expect(setElectionId).toHaveBeenCalledWith("1");
  });
});
