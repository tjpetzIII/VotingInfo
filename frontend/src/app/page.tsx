"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIntl, FormattedMessage } from "react-intl";
import { fetchAllElections, ElectionItem } from "@/lib/api";

// --- OCD division ID formatting ---

const STATE_NAMES: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas", ca: "California",
  co: "Colorado", ct: "Connecticut", de: "Delaware", fl: "Florida", ga: "Georgia",
  hi: "Hawaii", id: "Idaho", il: "Illinois", in: "Indiana", ia: "Iowa",
  ks: "Kansas", ky: "Kentucky", la: "Louisiana", me: "Maine", md: "Maryland",
  ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi", mo: "Missouri",
  mt: "Montana", ne: "Nebraska", nv: "Nevada", nh: "New Hampshire", nj: "New Jersey",
  nm: "New Mexico", ny: "New York", nc: "North Carolina", nd: "North Dakota", oh: "Ohio",
  ok: "Oklahoma", or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island", sc: "South Carolina",
  sd: "South Dakota", tn: "Tennessee", tx: "Texas", ut: "Utah", vt: "Vermont",
  va: "Virginia", wa: "Washington", wv: "West Virginia", wi: "Wisconsin", wy: "Wyoming",
  dc: "Washington D.C.",
};

function capitalize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatOcdSegment(key: string, value: string): string {
  switch (key) {
    case "country": return value.toLowerCase() === "us" ? "United States" : value.toUpperCase();
    case "state": return STATE_NAMES[value.toLowerCase()] ?? value.toUpperCase();
    case "county": return `${capitalize(value)} County`;
    case "city": return capitalize(value);
    case "cd": return `Congressional District ${value}`;
    case "sldu": return `Senate District ${value}`;
    case "sldl": return `House District ${value}`;
    default: return `${capitalize(key)} ${value}`;
  }
}

function parseOcdDivision(ocd: string): { key: string; label: string }[] {
  const path = ocd.replace(/^ocd-division\//, "");
  return path.split("/").map((segment) => {
    const colonIdx = segment.indexOf(":");
    if (colonIdx === -1) return { key: segment, label: capitalize(segment) };
    const key = segment.slice(0, colonIdx);
    const value = segment.slice(colonIdx + 1);
    return { key, label: formatOcdSegment(key, value) };
  });
}

/** Short label for list view — skips "United States" to save space */
function formatOcdShort(ocd: string): string {
  const parts = parseOcdDivision(ocd);
  const meaningful = parts.filter((p) => p.key !== "country");
  return (meaningful.length > 0 ? meaningful : parts).map((p) => p.label).join(" · ");
}

// --- Modal ---

function ElectionModal({
  election,
  onClose,
}: {
  election: ElectionItem;
  onClose: () => void;
}) {
  const divisionParts = election.ocd_division_id
    ? parseOcdDivision(election.ocd_division_id)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 leading-snug pr-4">
            {election.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {/* Election Day */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Election Day</p>
              <p className="text-sm font-semibold text-blue-800">{election.election_day}</p>
            </div>
          </div>

          {/* Election ID */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Election ID</p>
              <p className="text-sm font-mono text-gray-700">{election.id}</p>
            </div>
          </div>

          {/* Division — parsed breadcrumb */}
          {divisionParts.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">Division</p>
                <div className="flex flex-wrap gap-1.5">
                  {divisionParts.map((part, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full"
                    >
                      {i > 0 && (
                        <svg className="w-2.5 h-2.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                      {part.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// --- Page ---

export default function Home() {
  const intl = useIntl();
  const [selected, setSelected] = useState<ElectionItem | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["all-elections"],
    queryFn: fetchAllElections,
  });

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        <FormattedMessage id="home.title" />
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        <FormattedMessage id="home.subtitle" />
      </p>

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error instanceof Error
            ? error.message
            : intl.formatMessage({ id: "home.loadError" })}
        </div>
      )}

      {data && (
        <ul className="flex flex-col gap-2">
          {data.elections.map((election: ElectionItem) => (
            <li key={election.id}>
              <button
                onClick={() => setSelected(election)}
                className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4 hover:border-blue-200 hover:shadow-md transition-all group"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                    {election.name}
                  </p>
                  {election.ocd_division_id && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {formatOcdShort(election.ocd_division_id)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {election.election_day}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <ElectionModal election={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
