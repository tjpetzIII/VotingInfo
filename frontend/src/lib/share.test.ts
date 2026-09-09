import { describe, expect, it } from "vitest";
import { buildShareUrl } from "./share";

describe("share links", () => {
  it("omits address by default and includes it only when requested", () => {
    const current = "https://vote.example/elections/2?address=old%20value";
    expect(buildShareUrl(current, false, "123 Main St, Austin, TX 78701")).not.toContain("address=");
    expect(buildShareUrl(current, true, "123 Main St, Austin, TX 78701")).toContain("address=123");
  });
});
