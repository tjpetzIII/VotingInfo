import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import { AddressProvider } from "@/contexts/AddressContext";
import messages from "@/messages/en";
import AddressSummary from "./AddressSummary";

const SAVED = { street: "123 Main St", city: "Austin", state: "TX", zip: "78701" };

function renderSummary() {
  render(
    <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
      <AddressProvider>
        <AddressSummary />
      </AddressProvider>
    </IntlProvider>
  );
}

describe("AddressSummary", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders nothing when there is no saved address", () => {
    const { container } = render(
      <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
        <AddressProvider>
          <AddressSummary />
        </AddressProvider>
      </IntlProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the current saved address with a Change control", async () => {
    localStorage.setItem("address", JSON.stringify(SAVED));
    renderSummary();

    expect(await screen.findByText("Using: 123 Main St, Austin, TX 78701")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
  });

  it("Change reveals a pre-filled form; a valid submit updates the address and hides the form", async () => {
    const user = userEvent.setup();
    localStorage.setItem("address", JSON.stringify(SAVED));
    renderSummary();

    await user.click(await screen.findByRole("button", { name: "Change" }));

    // Pre-filled from the saved address.
    expect(screen.getByLabelText("Street Address")).toHaveValue("123 Main St");

    await user.clear(screen.getByLabelText("Street Address"));
    await user.type(screen.getByLabelText("Street Address"), "999 New Rd");
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Form is hidden again and the new address is now in effect and persisted.
    expect(screen.queryByLabelText("Street Address")).not.toBeInTheDocument();
    expect(screen.getByText("Using: 999 New Rd, Austin, TX 78701")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("address")!).street).toBe("999 New Rd");
  });

  it("an invalid submit shows the inline error and leaves the saved address unchanged", async () => {
    const user = userEvent.setup();
    localStorage.setItem("address", JSON.stringify(SAVED));
    renderSummary();

    await user.click(await screen.findByRole("button", { name: "Change" }));
    await user.clear(screen.getByLabelText("ZIP Code"));
    await user.type(screen.getByLabelText("ZIP Code"), "12");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("ZIP must be 5 digits.")).toBeInTheDocument();
    // Still editing, and the persisted address is untouched.
    expect(screen.getByLabelText("Street Address")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("address")!).zip).toBe("78701");
  });
});
