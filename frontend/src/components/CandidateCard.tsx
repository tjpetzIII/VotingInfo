"use client";

import { useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import type { CandidateDetail } from "@/lib/api";

const CHANNEL_CONFIG: Record<
  string,
  { label: string; urlFn: (id: string) => string; className: string }
> = {
  Twitter: {
    label: "X",
    urlFn: (id) => `https://twitter.com/${id.replace(/^@/, "")}`,
    className: "bg-black text-white",
  },
  Facebook: {
    label: "Facebook",
    urlFn: (id) => `https://facebook.com/${id}`,
    className: "bg-blue-600 text-white",
  },
  YouTube: {
    label: "YouTube",
    urlFn: (id) => `https://youtube.com/@${id.replace(/^@/, "")}`,
    className: "bg-red-600 text-white",
  },
  GooglePlus: {
    label: "Google+",
    urlFn: (id) => `https://plus.google.com/${id}`,
    className: "bg-red-600 text-white",
  },
};

const CURRENCY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function partyBadgeClass(party: string | null): string {
  if (!party) return "bg-gray-100 text-gray-600";
  const p = party.toLowerCase();
  if (p.includes("democrat")) return "bg-blue-100 text-blue-700";
  if (p.includes("republican")) return "bg-red-100 text-red-700";
  if (p.includes("libertarian")) return "bg-yellow-100 text-yellow-700";
  if (p.includes("green")) return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-600";
}

export default function CandidateCard({ candidate }: { candidate: CandidateDetail }) {
  const intl = useIntl();
  const [imgError, setImgError] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const initials = candidate.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasContact = !!(candidate.phone || candidate.email);

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
      {/* Photo + name + party */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {candidate.photo_url && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary external domains from the Civic API, can't be preconfigured for next/image optimization
            <img
              src={candidate.photo_url}
              alt={candidate.name}
              onError={() => setImgError(true)}
              className="w-16 h-16 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center border border-blue-200 select-none">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base leading-snug">
            {candidate.name}
          </h3>
          {candidate.party && (
            <span
              className={`mt-1.5 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${partyBadgeClass(candidate.party)}`}
            >
              {candidate.party}
            </span>
          )}
        </div>
      </div>

      {/* Website */}
      {candidate.candidate_url && (
        <a
          href={candidate.candidate_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 truncate"
        >
          {candidate.candidate_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </a>
      )}

      {/* Social media channels */}
      {candidate.channels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {candidate.channels.map((ch, i) => {
            const config = CHANNEL_CONFIG[ch.channel_type];
            if (!config) return null;
            return (
              <a
                key={i}
                href={config.urlFn(ch.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={`min-h-11 inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${config.className}`}
              >
                {config.label}
              </a>
            );
          })}
        </div>
      )}

      {/* Campaign finance (OpenFEC) — federal candidates with a confident match only */}
      {candidate.campaign_finance && (
        <div className="border-t border-gray-100 pt-3">
          <h4 className="text-sm font-medium text-gray-700">
            <FormattedMessage id="candidate.campaignFinance" />
          </h4>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500">
                {intl.formatMessage({ id: "candidate.totalRaised" })}
              </dt>
              <dd className="font-semibold text-gray-900">
                {CURRENCY_FORMAT.format(candidate.campaign_finance.total_raised)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">
                {intl.formatMessage({ id: "candidate.totalSpent" })}
              </dt>
              <dd className="font-semibold text-gray-900">
                {CURRENCY_FORMAT.format(candidate.campaign_finance.total_spent)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">
                {intl.formatMessage({ id: "candidate.cashOnHand" })}
              </dt>
              <dd className="font-semibold text-gray-900">
                {CURRENCY_FORMAT.format(candidate.campaign_finance.cash_on_hand)}
              </dd>
            </div>
          </dl>
          <p className="mt-1 text-xs text-gray-400">
            {intl.formatMessage(
              { id: "candidate.financeAsOf" },
              { date: candidate.campaign_finance.as_of_date }
            )}
          </p>
          {candidate.campaign_finance.top_contributors &&
            candidate.campaign_finance.top_contributors.length > 0 && (
              <div className="mt-3">
                <h5 className="text-xs font-medium text-gray-700">
                  <FormattedMessage id="candidate.topContributors" />
                </h5>
                <ul className="mt-1 space-y-0.5 text-sm text-gray-600">
                  {candidate.campaign_finance.top_contributors.map((c, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{c.name}</span>
                      <span className="text-gray-500">{CURRENCY_FORMAT.format(c.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* Collapsible contact info */}
      {hasContact && (
        <div className="border-t border-gray-100 pt-3">
          <button
            onClick={() => setContactOpen((o) => !o)}
            className="min-h-11 -my-2 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            <span className="text-xs">{contactOpen ? "▲" : "▼"}</span>
            <FormattedMessage id="candidate.contactInfo" />
          </button>
          {contactOpen && (
            <div className="mt-2 space-y-1 text-sm">
              {candidate.phone && (
                <p>
                  <span className="text-gray-500">
                    {intl.formatMessage({ id: "candidate.phone" })}{" "}
                  </span>
                  <a href={`tel:${candidate.phone}`} className="text-gray-800 hover:underline">
                    {candidate.phone}
                  </a>
                </p>
              )}
              {candidate.email && (
                <p>
                  <span className="text-gray-500">
                    {intl.formatMessage({ id: "candidate.email" })}{" "}
                  </span>
                  <a
                    href={`mailto:${candidate.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {candidate.email}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
