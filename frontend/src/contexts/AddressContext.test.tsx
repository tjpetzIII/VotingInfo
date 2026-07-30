import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AddressProvider,
  useAddress,
  formatAddress,
  parseFormattedAddress,
  type SavedAddress,
} from "./AddressContext";

const SAMPLE: SavedAddress = {
  street: "123 Main St",
  city: "Austin",
  state: "TX",
  zip: "78701",
};

function Probe() {
  const { address, setAddress, clearAddress } = useAddress();
  return (
    <div>
      <span data-testid="address">{address ? formatAddress(address) : "none"}</span>
      <button onClick={() => setAddress(SAMPLE)}>Save</button>
      <button onClick={() => clearAddress()}>Clear</button>
    </div>
  );
}

function renderProbe() {
  render(
    <AddressProvider>
      <Probe />
    </AddressProvider>
  );
}

describe("AddressContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to null when localStorage is empty", () => {
    renderProbe();
    expect(screen.getByTestId("address")).toHaveTextContent("none");
  });

  it("hydrates from a valid localStorage entry on mount", async () => {
    localStorage.setItem("address", JSON.stringify(SAMPLE));
    renderProbe();
    expect(await screen.findByTestId("address")).toHaveTextContent(
      "123 Main St, Austin, TX 78701"
    );
  });

  it("setAddress updates state and persists to localStorage", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByTestId("address")).toHaveTextContent("123 Main St, Austin, TX 78701");
    expect(JSON.parse(localStorage.getItem("address")!)).toEqual(SAMPLE);
  });

  it("clearAddress resets to null and removes the persisted entry", async () => {
    const user = userEvent.setup();
    localStorage.setItem("address", JSON.stringify(SAMPLE));
    renderProbe();

    expect(await screen.findByTestId("address")).toHaveTextContent("123 Main St");
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByTestId("address")).toHaveTextContent("none");
    expect(localStorage.getItem("address")).toBeNull();
  });

  // FR-009: corrupt or unreadable persisted data must degrade to "no saved address", not throw.
  it("falls back to null when the stored value is not valid JSON", () => {
    localStorage.setItem("address", "not json");
    renderProbe();
    expect(screen.getByTestId("address")).toHaveTextContent("none");
  });

  it("falls back to null when the stored JSON is missing required fields", () => {
    localStorage.setItem("address", JSON.stringify({ street: "123 Main St" }));
    renderProbe();
    expect(screen.getByTestId("address")).toHaveTextContent("none");
  });

  it("treats a missing entry identically to a first visit", () => {
    // No localStorage entry set.
    renderProbe();
    expect(screen.getByTestId("address")).toHaveTextContent("none");
  });
});

describe("formatAddress / parseFormattedAddress", () => {
  it("formats structured fields into the backend string", () => {
    expect(formatAddress(SAMPLE)).toBe("123 Main St, Austin, TX 78701");
  });

  it("round-trips a formatted string back to structured fields", () => {
    expect(parseFormattedAddress(formatAddress(SAMPLE))).toEqual(SAMPLE);
  });

  it("preserves a street that itself contains a comma", () => {
    const withApt: SavedAddress = { ...SAMPLE, street: "123 Main St, Apt 4" };
    expect(parseFormattedAddress(formatAddress(withApt))).toEqual(withApt);
  });

  it("uppercases the state and returns null for non-address free text", () => {
    expect(parseFormattedAddress("123 main st, austin, tx 78701")?.state).toBe("TX");
    expect(parseFormattedAddress("just some text")).toBeNull();
    expect(parseFormattedAddress("123 Main St, Austin")).toBeNull();
  });
});
