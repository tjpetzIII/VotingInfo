import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import messages from "@/messages/en";
import Loading from "./loading";

describe("Loading", () => {
  it("renders the loading message", () => {
    render(
      <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
        <Loading />
      </IntlProvider>
    );

    expect(screen.getByText("Loading your voter information...")).toBeInTheDocument();
  });
});
