import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider, useLocale } from "./LocaleContext";

function Probe() {
  const { locale, setLocale } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => setLocale("es")}>Switch to Spanish</button>
    </div>
  );
}

describe("LocaleContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to 'en' when localStorage is empty", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
  });

  it("reads a persisted locale from localStorage on mount", async () => {
    localStorage.setItem("locale", "es");

    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    expect(await screen.findByTestId("locale")).toHaveTextContent("es");
  });

  it("ignores an invalid stored locale and falls back to 'en'", () => {
    localStorage.setItem("locale", "fr");

    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
  });

  it("persists the new locale to localStorage when setLocale is called", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    await user.click(screen.getByRole("button", { name: "Switch to Spanish" }));

    expect(screen.getByTestId("locale")).toHaveTextContent("es");
    expect(localStorage.getItem("locale")).toBe("es");
  });
});
