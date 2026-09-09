import { describe, expect, it, vi } from "vitest";
import { inviteFriend } from "./invite";
describe("inviteFriend", () => {
  it("shares without address by default", async () => { Object.assign(navigator, { share: vi.fn().mockResolvedValue(undefined) }); await inviteFriend("https://example.test/invite?address=old", false, "123 Main"); expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({ url: "https://example.test/invite" })); });
  it("falls back to clipboard", async () => { Object.assign(navigator, { share: undefined, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } }); expect(await inviteFriend("https://example.test/invite", true, "123 Main")).toBe("copied"); });
});
