import { describe, expect, it } from "vitest";
import { serializeIcs } from "./ics";
describe("serializeIcs", () => {
  it("uses CRLF, escapes text, stable UID, and exclusive all-day end", () => {
    const item = { label: "Café, deadline; now", category: "mail", date: "2026-12-31", days_remaining: 1, action: "submitted" as const, source_wording: "Official\nwording" };
    const first = serializeIcs([item]); expect(first).toBe(serializeIcs([item])); expect(first).toContain("DTSTART;VALUE=DATE:20261231"); expect(first).toContain("DTEND;VALUE=DATE:20270101"); expect(first).toContain("Café\\, deadline\\; now"); expect(first.endsWith("\r\n")).toBe(true);
  });
  it("omits unknown cutoff events", () => { expect(serializeIcs([{ label: "Unknown", category: "x", date: "2026-01-01", days_remaining: 1, action: "unknown" }])).not.toContain("SUMMARY"); });
});
