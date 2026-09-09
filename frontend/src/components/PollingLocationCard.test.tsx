import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { IntlProvider } from "react-intl";
import messages from "@/messages/en";
import PollingLocationCard from "./PollingLocationCard";

function renderCard(location: ComponentProps<typeof PollingLocationCard>["location"]) {
  return render(
    <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
      <PollingLocationCard location={location} />
    </IntlProvider>
  );
}

describe("PollingLocationCard", () => {
  it("renders name, address, hours, and a directions link", () => {
    renderCard({
          name: "City Hall",
          location_name: "City Hall Annex",
          address: "1 Center Plaza, Austin, TX",
          hours: "7am - 8pm",
        });

    expect(screen.getByText("City Hall Annex")).toBeInTheDocument();
    expect(screen.getByText("1 Center Plaza, Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("7am - 8pm")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get Directions/ })).toHaveAttribute(
      "href",
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("1 Center Plaza, Austin, TX")}`
    );
  });

  it("falls back to 'name' then a default label when location_name is missing", () => {
    renderCard({ name: "City Hall", location_name: null, address: null, hours: null });
    expect(screen.getByText("City Hall")).toBeInTheDocument();
  });

  it("falls back to a default label when both names are missing", () => {
    renderCard({ name: null, location_name: null, address: null, hours: null });
    expect(screen.getByText("Polling Location")).toBeInTheDocument();
  });

  it("omits hours and directions link when address/hours are absent", () => {
    renderCard({ name: "City Hall", location_name: null, address: null, hours: null });
    expect(screen.queryByText(/Get Directions/)).not.toBeInTheDocument();
  });
});
