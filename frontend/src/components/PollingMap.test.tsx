import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("react-leaflet", () => ({
  MapContainer: ({
    children,
    center,
    zoom,
  }: {
    children: ReactNode;
    center: [number, number];
    zoom: number;
  }) => (
    <div data-testid="map" data-center={JSON.stringify(center)} data-zoom={zoom}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  CircleMarker: ({ children, center }: { children: ReactNode; center: [number, number] }) => (
    <div data-testid="circle-marker" data-center={JSON.stringify(center)}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children: ReactNode }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ setView: vi.fn() }),
}));

import PollingMap from "./PollingMap";

describe("PollingMap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to a US-wide view when there are no locations", () => {
    render(<PollingMap locations={[]} />);

    const map = screen.getByTestId("map");
    expect(map).toHaveAttribute("data-center", JSON.stringify([39.8283, -98.5795]));
    expect(map).toHaveAttribute("data-zoom", "4");
  });

  it("geocodes locations and renders a marker for each result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ lat: "30.2711", lon: "-97.7437" }],
      })
    );

    render(
      <PollingMap
        locations={[
          {
            name: "City Hall",
            location_name: "City Hall Annex",
            address: "1 Center Plaza, Austin, TX",
            hours: "7am-8pm",
          },
        ]}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("circle-marker")).toHaveAttribute(
        "data-center",
        JSON.stringify([30.2711, -97.7437])
      );
    });
    expect(screen.getByText("City Hall Annex")).toBeInTheDocument();
    expect(screen.getByText("1 Center Plaza, Austin, TX")).toBeInTheDocument();
    expect(screen.getByTestId("map")).toHaveAttribute("data-zoom", "13");
  });

  it("skips locations that fail to geocode without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(
      <PollingMap
        locations={[
          { name: "City Hall", location_name: null, address: "1 Center Plaza", hours: null },
        ]}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId("circle-marker")).not.toBeInTheDocument();
    });
    // Falls back to the default US-wide view since nothing geocoded successfully.
    expect(screen.getByTestId("map")).toHaveAttribute("data-zoom", "4");
  });

  it("skips locations with no address entirely", () => {
    render(
      <PollingMap locations={[{ name: "Mystery Spot", location_name: null, address: null, hours: null }]} />
    );

    expect(screen.queryByTestId("circle-marker")).not.toBeInTheDocument();
  });
});
