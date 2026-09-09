import type { ElectionDate } from "@/lib/api";
const esc = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (line: string) => { const out: string[] = []; for (let i = 0; i < line.length; i += 74) out.push((i ? " " : "") + line.slice(i, i + 74)); return out.join("\r\n"); };
const nextDay = (iso: string) => { const [y,m,d] = iso.split("-").map(Number); const date = new Date(Date.UTC(y,m-1,d)); date.setUTCDate(date.getUTCDate()+1); return date.toISOString().slice(0,10).replace(/-/g, ""); };
export function serializeIcs(dates: ElectionDate[], electionName = "Election"): string {
  const events = dates.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && !!item.action && item.action !== "unknown" && (!item.cutoff_time || !!item.timezone));
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VoteReady//Election Dates//EN", "CALSCALE:GREGORIAN"];
  for (const item of events) {
    const uid = `${item.category}-${item.date}-${item.method ?? "unknown"}-${item.action}@voteready`;
    const date = item.date.replace(/-/g, "");
    const timing = item.cutoff_time && item.timezone
      ? [`DTSTART;TZID=${esc(item.timezone)}:${date}T${item.cutoff_time.replace(":", "")}00`]
      : [`DTSTART;VALUE=DATE:${date}`, `DTEND;VALUE=DATE:${nextDay(item.date)}`];
    lines.push("BEGIN:VEVENT", `UID:${esc(uid)}`, `DTSTAMP:${date}T000000Z`, ...timing, `SUMMARY:${esc(item.label)}`, `DESCRIPTION:${esc(`${electionName} — ${item.label}. ${item.source_wording ?? "Check the official source for current instructions."}`)}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR"); return lines.map(fold).join("\r\n") + "\r\n";
}
