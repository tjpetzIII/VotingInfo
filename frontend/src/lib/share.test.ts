import { describe, expect, it } from "vitest";
import { buildShareUrl } from "./share";

describe("share links", () => {
  it("omits address by default and includes it only when requested", () => {
    const current = "https://vote.example/elections/2?address=old%20value";
    expect(buildShareUrl(current, false, "123 Main St, Austin, TX 78701")).not.toContain("address=");
    expect(buildShareUrl(current, true, "123 Main St, Austin, TX 78701")).toContain("address=123");
  });

  it("round-trips punctuation safely without retaining unrelated parameters", () => {
    const address = "12 O'Connor St., Apt #4, St. Louis, MO 63101";
    const shared = buildShareUrl("https://vote.example/ballot/3?address=old&token=discard", true, address);
    const parsed = new URL(shared);
    expect(parsed.searchParams.get("address")).toBe(address);
    expect(parsed.searchParams.get("token")).toBeNull();
  });

  it("creates an address-free deep link when consent is absent", () => {
    const shared = buildShareUrl("https://vote.example/elections/9?address=private", false, "private");
    expect(shared).toBe("https://vote.example/elections/9");
  });
});
