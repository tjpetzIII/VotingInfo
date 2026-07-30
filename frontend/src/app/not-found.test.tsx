import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import messages from "@/messages/en";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("renders a 404 message with a link back home", () => {
    render(
      <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
        <NotFound />
      </IntlProvider>
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Go home" });
    expect(link).toHaveAttribute("href", "/");
  });
});
