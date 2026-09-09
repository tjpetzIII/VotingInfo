import { render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";
import DataSourceNote from "./DataSourceNote";
import en from "@/messages/en";

describe("DataSourceNote", () => {
  it("renders provenance, cached freshness, and fallback disclosure", () => {
    render(
      <IntlProvider locale="en" messages={en}>
        <DataSourceNote metadata={{ provenance: "mixed", freshness: "cached", fallback_used: true }} />
      </IntlProvider>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Sources: Google Civic Information");
    expect(screen.getByRole("status")).toHaveTextContent("recent lookup");
    expect(screen.getByRole("status")).toHaveTextContent("fallback");
  });

  it("does not render when metadata is unavailable", () => {
    const { container } = render(
      <IntlProvider locale="en" messages={en}>
        <DataSourceNote />
      </IntlProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
