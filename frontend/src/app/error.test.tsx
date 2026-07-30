import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import messages from "@/messages/en";
import ErrorPage from "./error";

function renderError(error: Error & { digest?: string }, reset = vi.fn()) {
  render(
    <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
      <ErrorPage error={error} reset={reset} />
    </IntlProvider>
  );
  return { reset };
}

describe("Error boundary page", () => {
  it("shows the error's own message when present", () => {
    renderError(new Error("Something specific broke"));
    expect(screen.getByText("Something specific broke")).toBeInTheDocument();
  });

  it("falls back to the generic message when the error has no message", () => {
    renderError(new Error(""));
    expect(
      screen.getByText("An unexpected error occurred. Please try again.")
    ).toBeInTheDocument();
  });

  it("calls reset when 'Try Again' is clicked", async () => {
    const user = userEvent.setup();
    const { reset } = renderError(new Error("Boom"));

    await user.click(screen.getByRole("button", { name: "Try Again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
