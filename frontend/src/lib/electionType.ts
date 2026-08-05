export type ElectionTypeCategory =
  | "primary"
  | "general"
  | "special"
  | "runoff"
  | "generic";

// Google Civic API elections have no structured type field, only a human-readable name
// (e.g. "2026 General Election"). Order matters: "runoff" and "special" are checked before
// "primary"/"general" so a compound name like "2026 Special Primary Election" classifies as
// the more specific "special" rather than merely "primary".
export function classifyElectionType(name: string): ElectionTypeCategory {
  const lower = name.toLowerCase();
  if (lower.includes("runoff")) return "runoff";
  if (lower.includes("special")) return "special";
  if (lower.includes("primary")) return "primary";
  if (lower.includes("general")) return "general";
  return "generic";
}
