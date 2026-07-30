import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import AddressForm from "./AddressForm";
import messages from "@/messages/en";

function renderForm(
  onSubmit = vi.fn(),
  initialValues?: Parameters<typeof AddressForm>[0]["initialValues"]
) {
  render(
    <IntlProvider locale="en" messages={messages as unknown as Record<string, string>}>
      <AddressForm
        onSubmit={onSubmit}
        loading={false}
        submitLabel="Search"
        initialValues={initialValues}
      />
    </IntlProvider>
  );
  return { onSubmit };
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  { street = "123 Main St", city = "Austin", state = "TX", zip = "78701" } = {}
) {
  await user.type(screen.getByLabelText("Street Address"), street);
  await user.type(screen.getByLabelText("City"), city);
  await user.type(screen.getByLabelText("State"), state);
  await user.type(screen.getByLabelText("ZIP Code"), zip);
}

describe("AddressForm validation", () => {
  it("rejects an invalid state and does not call onSubmit", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await fillForm(user, { state: "1A" });
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("State must be 2 letters.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an invalid zip and does not call onSubmit", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await fillForm(user, { zip: "123" });
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("ZIP must be 5 digits.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("accepts valid input and calls onSubmit with the formatted address", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSubmit).toHaveBeenCalledWith("123 Main St, Austin, TX 78701");
    expect(screen.queryByText("State must be 2 letters.")).not.toBeInTheDocument();
    expect(screen.queryByText("ZIP must be 5 digits.")).not.toBeInTheDocument();
  });
});

describe("AddressForm pre-fill", () => {
  const PREFILL = { street: "456 Oak Ave", city: "Dallas", state: "TX", zip: "75201" };

  it("populates all four fields from initialValues", () => {
    renderForm(vi.fn(), PREFILL);

    expect(screen.getByLabelText("Street Address")).toHaveValue("456 Oak Ave");
    expect(screen.getByLabelText("City")).toHaveValue("Dallas");
    expect(screen.getByLabelText("State")).toHaveValue("TX");
    expect(screen.getByLabelText("ZIP Code")).toHaveValue("75201");
  });

  it("submits the pre-filled values unchanged through the existing validation path", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm(vi.fn(), PREFILL);

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSubmit).toHaveBeenCalledWith("456 Oak Ave, Dallas, TX 75201");
  });
});
