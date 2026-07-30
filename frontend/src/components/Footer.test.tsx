import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import messages from "@/messages/en";
import Footer from "./Footer";

describe("Footer", () => {
  it("renders the copyright notice with the current year", () => {
    render(
      <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
        <Footer />
      </IntlProvider>
    );

    const year = new Date().getFullYear();
    expect(
      screen.getByText(`© ${year} VoteReady. Empowering voters everywhere.`)
    ).toBeInTheDocument();
  });
});
