"use client";

import { useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import {
  fetchVoterInfo,
  fetchRegistration,
  type VoterInfoResponse,
  type RegistrationResponse,
  type RegistrationAddress,
  type ElectionOfficial,
} from "@/lib/api";
import AddressForm from "@/components/AddressForm";

// ---------------------------------------------------------------------------
// Registration helpers (moved from registration/page.tsx)
// ---------------------------------------------------------------------------

function formatDeadline(raw: string): string {
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

function SectionLabel({ id }: { id: string }) {
  return (
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
      <FormattedMessage id={id} />
    </p>
  );
}

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

function OfficialRow({ official }: { official: ElectionOfficial }) {
  return (
    <li className="text-sm text-gray-700">
      {official.name && <p className="font-medium capitalize">{official.name}</p>}
      {official.title && <p className="text-gray-500 text-xs capitalize">{official.title}</p>}
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
      <p className="text-sm text-gray-700 capitalize">{formatted}</p>
    </div>
  );
}

function FlagRow({ value, yesId, noId }: { value: boolean; yesId: string; noId: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <span className={`inline-block w-2 h-2 rounded-full ${value ? "bg-green-500" : "bg-gray-300"}`} />
      <FormattedMessage id={value ? yesId : noId} />
    </div>
  );
}

function RegistrationFlags({ result }: { result: RegistrationResponse }) {
  if (result.online_registration === undefined && result.same_day_registration === undefined) {
    return null;
  }
  return (
    <div>
      <SectionLabel id="registration.stateInfo" />
      <div className="flex flex-col gap-1.5 mt-1">
        {result.online_registration !== undefined && (
          <FlagRow
            value={result.online_registration}
            yesId="registration.onlineYes"
            noId="registration.onlineNo"
          />
        )}
        {result.same_day_registration !== undefined && (
          <FlagRow
            value={result.same_day_registration}
            yesId="registration.sameDayYes"
            noId="registration.sameDayNo"
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function VoterInfoPage() {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [voterInfoResult, setVoterInfoResult] = useState<VoterInfoResponse | null>(null);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResponse | null>(null);
  const [voterInfoError, setVoterInfoError] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  async function handleSubmit(address: string) {
    setVoterInfoResult(null);
    setRegistrationResult(null);
    setVoterInfoError(null);
    setRegistrationError(null);
    setLoading(true);

    const [voterRes, regRes] = await Promise.allSettled([
      fetchVoterInfo(address),
      fetchRegistration(address),
    ]);

    if (voterRes.status === "fulfilled") {
      setVoterInfoResult(voterRes.value);
    } else {
      setVoterInfoError(
        voterRes.reason instanceof Error ? voterRes.reason.message : "Something went wrong."
      );
    }

    if (regRes.status === "fulfilled") {
      setRegistrationResult(regRes.value);
    } else {
      setRegistrationError(
        regRes.reason instanceof Error ? regRes.reason.message : "Something went wrong."
      );
    }

    setLoading(false);
  }

  const usefulLinks = registrationResult
    ? [
        { href: registrationResult.election_info_url, labelId: "registration.electionInfo" },
        { href: registrationResult.absentee_voting_info_url, labelId: "registration.absenteeInfo" },
        { href: registrationResult.voting_location_finder_url, labelId: "registration.findPollingPlace" },
        { href: registrationResult.ballot_info_url, labelId: "registration.ballotInfo" },
        { href: registrationResult.election_rules_url, labelId: "registration.electionRules" },
      ].filter((l) => !!l.href)
    : [];

  const hasResults = voterInfoResult || registrationResult || voterInfoError || registrationError;

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      {/* Outer row: spacer shrinks to slide form left on md+ */}
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Spacer — transitions width to push form from center to left on md+ */}
        <div
          className="hidden md:block shrink-0 transition-[width] duration-500 ease-in-out"
          style={{ width: hasResults ? "0px" : "calc(50% - 160px)" }}
        />
        {/* Address form — fixed width, no size change */}
        <div className="bg-white rounded-2xl shadow-md p-8 shrink-0 w-full md:w-80">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            <FormattedMessage id="voterInfo.title" />
          </h1>
          <p className="text-gray-500 mb-6 text-sm">
            <FormattedMessage id="voterInfo.subtitle" />
          </p>
          <AddressForm
            onSubmit={handleSubmit}
            loading={loading}
            submitLabel={intl.formatMessage({ id: "voterInfo.submit" })}
            loadingLabel={intl.formatMessage({ id: "voterInfo.submitting" })}
          />
        </div>

      {hasResults && (
        <div className="flex-1 min-w-0 animate-fade-slide-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

          {/* ---- Voter info error ---- */}
          {voterInfoError && (
            <div className="col-span-full p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {voterInfoError}
            </div>
          )}

          {voterInfoResult && (
            <>
              {/* Election name — full width banner */}
              <div className="col-span-full bg-white rounded-2xl shadow-md p-6 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900 capitalize">
                  {voterInfoResult.election.name}
                </h2>
                <span className="shrink-0 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full">
                  {intl.formatMessage(
                    { id: "voterInfo.electionDay" },
                    { day: voterInfoResult.election.election_day }
                  )}
                </span>
              </div>

              {/* Polling locations — 1 col */}
              {voterInfoResult.polling_locations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-md p-6 lg:col-span-1">
                  <h2 className="text-base font-semibold text-gray-900 mb-3">
                    <FormattedMessage id="voterInfo.pollingLocations" />
                  </h2>
                  <ul className="flex flex-col gap-3">
                    {voterInfoResult.polling_locations.map((loc, i) => (
                      <li key={i} className="text-sm text-gray-700">
                        {loc.location_name && <p className="font-medium capitalize">{loc.location_name}</p>}
                        {loc.address && <p className="text-gray-500 capitalize">{loc.address}</p>}
                        {loc.hours && <p className="text-gray-400 text-xs mt-0.5 capitalize">{loc.hours}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contests — 2 cols on lg */}
              {voterInfoResult.contests.length > 0 && (
                <div className="bg-white rounded-2xl shadow-md p-6 md:col-span-1 lg:col-span-2">
                  <h2 className="text-base font-semibold text-gray-900 mb-3">
                    <FormattedMessage id="voterInfo.contests" />
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {voterInfoResult.contests.map((contest, i) => (
                      <li key={i} className="border border-gray-100 rounded-xl p-3">
                        <p className="text-sm font-medium text-gray-800 capitalize">
                          {contest.office ?? intl.formatMessage({ id: "voterInfo.unknownOffice" })}
                          {contest.district && (
                            <span className="text-gray-400 font-normal capitalize"> — {contest.district}</span>
                          )}
                        </p>
                        {contest.candidates.length > 0 && (
                          <ul className="mt-2 flex flex-col gap-1">
                            {contest.candidates.map((c, j) => (
                              <li key={j} className="text-sm text-gray-600 flex items-center gap-1.5 capitalize">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                                {c.name}
                                {c.party && <span className="text-gray-400 text-xs">({c.party})</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* ---- Registration Section ---- */}
          {(registrationResult || registrationError) && (
            <>
              <div className="col-span-full border-t border-gray-200 pt-2">
                <h2 className="text-lg font-semibold text-gray-700">
                  <FormattedMessage id="voterInfo.registrationSection" />
                </h2>
              </div>

              {registrationError && (
                <div className="col-span-full p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {registrationError}
                </div>
              )}

              {registrationResult && (
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  {/* Status + CTA */}
                  <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-4">
                    <StatusBadge
                      available={registrationResult.available}
                      hasUrl={!!registrationResult.registration_url}
                    />

                    {registrationResult.registration_deadline && (
                      <div>
                        <SectionLabel id="registration.deadline" />
                        <p className="text-gray-900 font-semibold text-lg">
                          {formatDeadline(registrationResult.registration_deadline)}
                        </p>
                      </div>
                    )}

                    {(registrationResult.registration_url || registrationResult.registration_confirmation_url) && (
                      <div className="flex flex-col gap-2">
                        {registrationResult.registration_url && (
                          <a
                            href={registrationResult.registration_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
                          >
                            <FormattedMessage id="registration.registerNow" />
                          </a>
                        )}
                        {registrationResult.registration_confirmation_url && (
                          <a
                            href={registrationResult.registration_confirmation_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-2.5 rounded-lg transition-colors"
                          >
                            <FormattedMessage id="registration.checkRegistration" />
                          </a>
                        )}
                      </div>
                    )}

                    {!registrationResult.available && !registrationResult.registration_url && (
                      <p className="text-sm text-gray-600">
                        <FormattedMessage id="registration.noData" />
                      </p>
                    )}
                  </div>

                  {/* State info + useful links */}
                  <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-4">
                    <RegistrationFlags result={registrationResult} />

                    {registrationResult.voter_services && registrationResult.voter_services.length > 0 && (
                      <div>
                        <SectionLabel id="registration.voterServices" />
                        <ul className="mt-1 flex flex-wrap gap-2">
                          {registrationResult.voter_services.map((svc, i) => (
                            <li
                              key={i}
                              className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-medium capitalize"
                            >
                              {svc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

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
                  </div>

                  {/* Office info */}
                  {(registrationResult.admin_name ||
                    registrationResult.hours_of_operation ||
                    registrationResult.correspondence_address ||
                    registrationResult.physical_address ||
                    (registrationResult.election_officials && registrationResult.election_officials.length > 0)) && (
                    <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-4">
                      {registrationResult.admin_name && (
                        <div>
                          <SectionLabel id="registration.adminName" />
                          <p className="text-gray-900 font-semibold capitalize">{registrationResult.admin_name}</p>
                        </div>
                      )}

                      {registrationResult.hours_of_operation && (
                        <div>
                          <SectionLabel id="registration.hours" />
                          <p className="text-sm text-gray-700 capitalize">{registrationResult.hours_of_operation}</p>
                        </div>
                      )}

                      {registrationResult.correspondence_address && (
                        <AddressBlock
                          addr={registrationResult.correspondence_address}
                          labelId="registration.mailingAddress"
                        />
                      )}

                      {registrationResult.physical_address && (
                        <AddressBlock
                          addr={registrationResult.physical_address}
                          labelId="registration.physicalAddress"
                        />
                      )}

                      {registrationResult.election_officials && registrationResult.election_officials.length > 0 && (
                        <div>
                          <SectionLabel id="registration.officials" />
                          <ul className="mt-2 flex flex-col gap-3">
                            {registrationResult.election_officials.map((official, i) => (
                              <OfficialRow key={i} official={official} />
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        </div>
      )}
      </div>
    </div>
  );
}
