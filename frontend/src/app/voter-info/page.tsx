"use client";

import { useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { fetchVoterInfo, VoterInfoResponse } from "@/lib/api";

export default function VoterInfoPage() {
  const intl = useIntl();
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VoterInfoResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!street || !city || !state || !zip) {
      setError(intl.formatMessage({ id: "voterInfo.fillAllFields" }));
      return;
    }

    setLoading(true);
    try {
      const address = `${street}, ${city}, ${state} ${zip}`;
      const data = await fetchVoterInfo(address);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-full py-16 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          <FormattedMessage id="voterInfo.title" />
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          <FormattedMessage id="voterInfo.subtitle" />
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="street"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <FormattedMessage id="voterInfo.streetLabel" />
            </label>
            <input
              id="street"
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder={intl.formatMessage({ id: "voterInfo.streetPlaceholder" })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <FormattedMessage id="voterInfo.cityLabel" />
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={intl.formatMessage({ id: "voterInfo.cityPlaceholder" })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="state"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <FormattedMessage id="voterInfo.stateLabel" />
            </label>
            <input
              id="state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
              placeholder={intl.formatMessage({ id: "voterInfo.statePlaceholder" })}
              maxLength={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>

          <div>
            <label
              htmlFor="zip"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <FormattedMessage id="voterInfo.zipLabel" />
            </label>
            <input
              id="zip"
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder={intl.formatMessage({ id: "voterInfo.zipPlaceholder" })}
              maxLength={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading
              ? intl.formatMessage({ id: "voterInfo.submitting" })
              : intl.formatMessage({ id: "voterInfo.submit" })}
          </button>
        </form>
      </div>

      {result && (
        <div className="w-full max-w-md mt-6 flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{result.election.name}</h2>
            <p className="text-sm text-gray-500">
              {intl.formatMessage({ id: "voterInfo.electionDay" }, { day: result.election.election_day })}
            </p>
          </div>

          {result.polling_locations.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                <FormattedMessage id="voterInfo.pollingLocations" />
              </h2>
              <ul className="flex flex-col gap-3">
                {result.polling_locations.map((loc, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {loc.location_name && (
                      <p className="font-medium">{loc.location_name}</p>
                    )}
                    {loc.address && <p className="text-gray-500">{loc.address}</p>}
                    {loc.hours && <p className="text-gray-400 text-xs mt-0.5">{loc.hours}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.contests.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                <FormattedMessage id="voterInfo.contests" />
              </h2>
              <ul className="flex flex-col gap-4">
                {result.contests.map((contest, i) => (
                  <li key={i}>
                    <p className="text-sm font-medium text-gray-800">
                      {contest.office ?? intl.formatMessage({ id: "voterInfo.unknownOffice" })}
                      {contest.district && (
                        <span className="text-gray-400 font-normal"> — {contest.district}</span>
                      )}
                    </p>
                    {contest.candidates.length > 0 && (
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {contest.candidates.map((c, j) => (
                          <li key={j} className="text-sm text-gray-600">
                            {c.name}
                            {c.party && (
                              <span className="text-gray-400"> ({c.party})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
