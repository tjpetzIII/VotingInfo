import { describe, it, expect } from "vitest";
import AllElectionsRedirect from "./page";

describe("AllElectionsRedirect", () => {
  it("redirects to the home page", () => {
    let caught: unknown;
    try {
      AllElectionsRedirect();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    const digest = (caught as { digest?: string }).digest ?? "";
    expect(digest).toContain("NEXT_REDIRECT");
    expect(digest).toContain(";/;");
  });
});
