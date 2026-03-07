"use client";

import { useQuery } from "@tanstack/react-query";
import { useIntl, FormattedMessage } from "react-intl";
import { fetchAllElections, ElectionItem } from "@/lib/api";

export default function Home() {
  const intl = useIntl();
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
        <ul className="flex flex-col gap-3">
          {data.elections.map((election: ElectionItem) => (
            <li
              key={election.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium text-gray-900">{election.name}</p>
                {election.ocd_division_id && (
                  <p className="text-xs text-gray-400 mt-0.5">{election.ocd_division_id}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  {election.election_day}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
