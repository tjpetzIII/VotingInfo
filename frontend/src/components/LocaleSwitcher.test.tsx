import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/contexts/LocaleContext";
import LocaleSwitcher from "./LocaleSwitcher";

function renderSwitcher() {
  return render(
    <LocaleProvider>
      <LocaleSwitcher />
    </LocaleProvider>
  );
}

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows 'ES' and toggles to Spanish on click", async () => {
    const user = userEvent.setup();
    renderSwitcher();

    const button = screen.getByRole("button", { name: "Switch to Spanish" });
    expect(button).toHaveTextContent("ES");

    await user.click(button);

    expect(screen.getByRole("button", { name: "Cambiar a Inglés" })).toHaveTextContent("EN");
  });
});
