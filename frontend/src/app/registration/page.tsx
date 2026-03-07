"use client";

import { type FormEvent, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import {
  fetchRegistration,
  type RegistrationResponse,
  type RegistrationAddress,
  type ElectionOfficial,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDeadline(raw: string): string {
  // Google Civic API returns MM/DD/YYYY or M/D/YYYY
  const parts = raw.split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts.map(Number);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
  }
  return raw;
}

function formatAddress(addr: RegistrationAddress): string {
  return [addr.location_name, addr.line1, addr.city, addr.state, addr.zip]
    .filter(Boolean)
    .join(", ");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ available, hasUrl }: { available: boolean; hasUrl: boolean }) {
  if (!available) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full bg-red-400" />
        <span className="text-sm font-medium text-red-700">
          <FormattedMessage id="registration.statusUnavailable" />
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded-full ${hasUrl ? "bg-green-500" : "bg-yellow-400"}`} />
      <span className={`text-sm font-medium ${hasUrl ? "text-green-700" : "text-yellow-700"}`}>
        <FormattedMessage id="registration.statusOpen" />
      </span>
    </div>
  );
}

function InfoLink({ href, labelId }: { href: string; labelId: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
    >
      <FormattedMessage id={labelId} />
      <span aria-hidden>↗</span>
    </a>
  );
}

function SectionLabel({ id }: { id: string }) {
  return (
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
      <FormattedMessage id={id} />
    </p>
  );
}

function OfficialRow({ official }: { official: ElectionOfficial }) {
  return (
    <li className="text-sm text-gray-700">
      {official.name && <p className="font-medium">{official.name}</p>}
      {official.title && <p className="text-gray-500 text-xs">{official.title}</p>}
      <div className="flex flex-wrap gap-x-4 mt-0.5">
        {official.email && (
          <a href={`mailto:${official.email}`} className="text-blue-600 hover:underline text-xs">
            {official.email}
          </a>
        )}
        {official.phone && (
          <a href={`tel:${official.phone}`} className="text-blue-600 hover:underline text-xs">
            {official.phone}
          </a>
        )}
        {official.fax && (
          <span className="text-gray-500 text-xs">
            <FormattedMessage id="registration.fax" /> {official.fax}
          </span>
        )}
      </div>
    </li>
  );
}

function AddressBlock({ addr, labelId }: { addr: RegistrationAddress; labelId: string }) {
  const formatted = formatAddress(addr);
  if (!formatted) return null;
  return (
    <div>
      <SectionLabel id={labelId} />
      <p className="text-sm text-gray-700">{formatted}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RegistrationPage() {
  const intl = useIntl();
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegistrationResponse | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!street || !city || !state || !zip) {
      setError(intl.formatMessage({ id: "registration.fillAllFields" }));
      return;
    }

    setLoading(true);
    try {
      const address = `${street}, ${city}, ${state} ${zip}`;
      setResult(await fetchRegistration(address));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const usefulLinks = result
    ? [
        { href: result.election_info_url, labelId: "registration.electionInfo" },
        { href: result.absentee_voting_info_url, labelId: "registration.absenteeInfo" },
        { href: result.voting_location_finder_url, labelId: "registration.findPollingPlace" },
        { href: result.ballot_info_url, labelId: "registration.ballotInfo" },
        { href: result.election_rules_url, labelId: "registration.electionRules" },
      ].filter((l) => !!l.href)
    : [];

  return (
    <div className="flex flex-col items-center min-h-full py-16 px-4">
      {/* Address form */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          <FormattedMessage id="registration.title" />
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          <FormattedMessage id="registration.subtitle" />
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
              <FormattedMessage id="registration.streetLabel" />
            </label>
            <input
              id="street"
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder={intl.formatMessage({ id: "registration.streetPlaceholder" })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              <FormattedMessage id="registration.cityLabel" />
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={intl.formatMessage({ id: "registration.cityPlaceholder" })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                <FormattedMessage id="registration.stateLabel" />
              </label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                placeholder={intl.formatMessage({ id: "registration.statePlaceholder" })}
                maxLength={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
                <FormattedMessage id="registration.zipLabel" />
              </label>
              <input
                id="zip"
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder={intl.formatMessage({ id: "registration.zipPlaceholder" })}
                maxLength={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading
              ? intl.formatMessage({ id: "registration.submitting" })
              : intl.formatMessage({ id: "registration.submit" })}
          </button>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="w-full max-w-md mt-6 flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-6">
            <StatusBadge available={result.available} hasUrl={!!result.registration_url} />

            {!result.available ? (
              <p className="text-sm text-gray-600">
                <FormattedMessage id="registration.noData" />
              </p>
            ) : (
              <>
                {/* Deadline */}
                {result.registration_deadline && (
                  <div>
                    <SectionLabel id="registration.deadline" />
                    <p className="text-gray-900 font-semibold text-lg">
                      {formatDeadline(result.registration_deadline)}
                    </p>
                  </div>
                )}

                {/* Registration CTAs */}
                {(result.registration_url || result.registration_confirmation_url) && (
                  <div className="flex flex-col gap-2">
                    {result.registration_url && (
                      <a
                        href={result.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
                      >
                        <FormattedMessage id="registration.registerNow" />
                      </a>
                    )}
                    {result.registration_confirmation_url && (
                      <a
                        href={result.registration_confirmation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-2.5 rounded-lg transition-colors"
                      >
                        <FormattedMessage id="registration.checkRegistration" />
                      </a>
                    )}
                  </div>
                )}

                {/* Voter services */}
                {result.voter_services && result.voter_services.length > 0 && (
                  <div>
                    <SectionLabel id="registration.voterServices" />
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {result.voter_services.map((svc, i) => (
                        <li
                          key={i}
                          className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-medium"
                        >
                          {svc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Useful links */}
                {usefulLinks.length > 0 && (
                  <div>
                    <SectionLabel id="registration.usefulLinks" />
                    <ul className="mt-1 flex flex-col gap-2">
                      {usefulLinks.map((link) => (
                        <li key={link.labelId}>
                          <InfoLink href={link.href!} labelId={link.labelId} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Admin body */}
                {result.admin_name && (
                  <div>
                    <SectionLabel id="registration.adminName" />
                    <p className="text-gray-900 font-semibold">{result.admin_name}</p>
                  </div>
                )}

                {result.hours_of_operation && (
                  <div>
                    <SectionLabel id="registration.hours" />
                    <p className="text-sm text-gray-700">{result.hours_of_operation}</p>
                  </div>
                )}

                {result.correspondence_address && (
                  <AddressBlock
                    addr={result.correspondence_address}
                    labelId="registration.mailingAddress"
                  />
                )}

                {result.physical_address && (
                  <AddressBlock
                    addr={result.physical_address}
                    labelId="registration.physicalAddress"
                  />
                )}

                {/* Election officials */}
                {result.election_officials && result.election_officials.length > 0 && (
                  <div>
                    <SectionLabel id="registration.officials" />
                    <ul className="mt-2 flex flex-col gap-3">
                      {result.election_officials.map((official, i) => (
                        <OfficialRow key={i} official={official} />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
