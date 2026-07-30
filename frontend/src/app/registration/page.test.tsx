import { describe, it, expect } from "vitest";
import RegistrationPage from "./page";

describe("RegistrationPage", () => {
  it("redirects to /voter-info", () => {
    let caught: unknown;
    try {
      RegistrationPage();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    const digest = (caught as { digest?: string }).digest ?? "";
    expect(digest).toContain("NEXT_REDIRECT");
    expect(digest).toContain(";/voter-info;");
  });
});
