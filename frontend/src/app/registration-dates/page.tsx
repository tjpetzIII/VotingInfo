"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPaElections, PaStateDataResponse } from "@/lib/api";

// ---- State card data (add more states here later) ----
const STATE_CARDS = [
  {
    code: "PA",
    name: "Pennsylvania",
    flag: "🏛️",
  },
];

// ---- Modal ----

function Modal({
  data,
  onClose,
}: {
  data: PaStateDataResponse;
  onClose: () => void;
}) {
  const typeColors: Record<string, string> = {
    primary: "bg-blue-50 text-blue-700",
    general: "bg-green-50 text-green-700",
    special: "bg-amber-50 text-amber-700",
    other: "bg-gray-50 text-gray-600",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Pennsylvania Elections
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Data sourced from pa.gov
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Upcoming Elections */}
          {data.elections.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Upcoming Elections
              </h3>
              <div className="space-y-3">
                {data.elections.map((e, i) => (
                  <div
                    key={e.id ?? i}
                    className="border border-gray-100 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-gray-900">
                        {e.election_name}
                      </p>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                          typeColors[e.election_type] ?? typeColors.other
                        }`}
                      >
                        {e.election_type}
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      {e.election_date}
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {e.polls_hours && (
                        <p>
                          <span className="text-gray-400">Polls:</span>{" "}
                          {e.polls_hours}
                        </p>
                      )}
                      {e.registration_deadline && (
                        <p>
                          <span className="text-gray-400">
                            Registration deadline:
                          </span>{" "}
                          {e.registration_deadline}
                        </p>
                      )}
                      {e.mail_in_deadline && (
                        <p>
                          <span className="text-gray-400">
                            Mail-in/absentee deadline:
                          </span>{" "}
                          {e.mail_in_deadline}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Important Dates */}
          {data.important_dates.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Important Dates {data.important_dates[0]?.election_year}
              </h3>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {[...data.important_dates]
                      .sort(
                        (a, b) =>
                          new Date(a.event_date).getTime() -
                          new Date(b.event_date).getTime()
                      )
                      .map((d, i) => (
                      <tr
                        key={d.id ?? i}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-4 py-2.5 text-blue-600 font-medium whitespace-nowrap align-top w-1/3">
                          {d.event_date}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">
                          {d.event_description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {data.elections.length === 0 && data.important_dates.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No data available yet. Run the PA scraper to populate.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Page ----

export default function RegistrationDatesPage() {
  const [open, setOpen] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pa-elections"],
    queryFn: fetchPaElections,
    enabled: open === "PA",
  });

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Registration Dates
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Key election and voter registration deadlines by state.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {STATE_CARDS.map((state) => (
          <button
            key={state.code}
            onClick={() => setOpen(state.code)}
            className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-6 text-left hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="text-3xl mb-3">{state.flag}</div>
            <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {state.name}
            </p>
            <p className="text-xs text-gray-400 mt-1">{state.code}</p>
            <p className="text-xs text-blue-500 mt-3 font-medium">
              View details →
            </p>
          </button>
        ))}
      </div>

      {/* Modal */}
      {open === "PA" && (
        <>
          {isLoading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
              <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
                <p className="text-red-600 text-sm mb-4">
                  {error instanceof Error
                    ? error.message
                    : "Failed to load PA data"}
                </p>
                <button
                  onClick={() => setOpen(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          {data && <Modal data={data} onClose={() => setOpen(null)} />}
        </>
      )}
    </div>
  );
}
