"use client";

import { useCallback, useEffect, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { fetchElectionDates, type ElectionDate } from "@/lib/api";
import AddressForm from "@/components/AddressForm";
import AddressSummary from "@/components/AddressSummary";
import {
  useAddress,
  formatAddress,
  parseFormattedAddress,
} from "@/contexts/AddressContext";

// ---------------------------------------------------------------------------
// Category metadata (icon + color classes are literal strings so Tailwind's
// JIT scanner can find them — no dynamic `bg-${color}-50` construction).
// ---------------------------------------------------------------------------

const CATEGORY_STYLES: Record<string, { icon: string; badge: string; ring: string }> = {
  election_day: { icon: "🗳️", badge: "bg-blue-50 text-blue-700", ring: "ring-blue-400" },
  registration_deadline: { icon: "📝", badge: "bg-purple-50 text-purple-700", ring: "ring-purple-400" },
  mail_in_request_deadline: { icon: "✉️", badge: "bg-amber-50 text-amber-700", ring: "ring-amber-400" },
  mail_in_return_deadline: { icon: "📮", badge: "bg-rose-50 text-rose-700", ring: "ring-rose-400" },
  early_voting_start: { icon: "🏁", badge: "bg-green-50 text-green-700", ring: "ring-green-400" },
  early_voting_end: { icon: "🏁", badge: "bg-green-50 text-green-700", ring: "ring-green-400" },
  general: { icon: "📅", badge: "bg-gray-50 text-gray-600", ring: "ring-gray-400" },
};

function categoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.general;
}

/** Parses an ISO "YYYY-MM-DD" string as a local date (avoids UTC-shift off-by-one). */
function parseIsoDateLocal(iso: string): Date | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplayDate(iso: string): string {
  const date = parseIsoDateLocal(iso);
  if (!date) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Date card
// ---------------------------------------------------------------------------

function DateCard({ item, isNextUp }: { item: ElectionDate; isNextUp: boolean }) {
  const intl = useIntl();
  const style = categoryStyle(item.category);
  const isPast = item.days_remaining < 0;
  const categoryLabel = intl.formatMessage({
    id: `dates.category.${item.category}`,
    defaultMessage: item.category,
  });
  const explanation = intl.formatMessage({
    id: `dates.explanation.${item.category}`,
    defaultMessage: "",
  });

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-md p-6 flex flex-col gap-3 transition-opacity ${
        isPast ? "opacity-60" : ""
      } ${isNextUp ? `ring-2 ${style.ring}` : ""}`}
    >
      {isNextUp && (
        <span className="absolute -top-3 left-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
          {item.days_remaining === 0 ? (
            <FormattedMessage id="dates.nextUpToday" />
          ) : (
            <FormattedMessage id="dates.nextUpIn" values={{ days: item.days_remaining }} />
          )}
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${style.badge}`}>
          <span aria-hidden>{style.icon}</span>
          {categoryLabel}
        </span>
        {isPast && (
          <span className="text-xs font-medium text-gray-500 shrink-0">
            <FormattedMessage id="dates.pastLabel" />
          </span>
        )}
      </div>

      <div>
        <p className={`text-base font-semibold text-gray-900 capitalize ${isPast ? "line-through decoration-gray-400" : ""}`}>
          {item.label}
        </p>
        <p className={`text-sm font-medium mt-0.5 ${isPast ? "text-gray-500 line-through" : "text-blue-600"}`}>
          {formatDisplayDate(item.date)}
        </p>
      </div>

      {explanation && <p className="text-sm text-gray-500">{explanation}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DatesPage() {
  const intl = useIntl();
  const { address: savedAddress, setAddress } = useAddress();
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState<ElectionDate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runFetch = useCallback(async (address: string) => {
    setDates(null);
    setError(null);
    setLoading(true);
    try {
      const result = await fetchElectionDates(address);
      setDates(result.dates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch whenever a saved address is present (mount-time hydration or a change from any page).
  const formatted = savedAddress ? formatAddress(savedAddress) : null;
  useEffect(() => {
    if (formatted) runFetch(formatted);
  }, [formatted, runFetch]);

  function handleSubmit(address: string) {
    const parsed = parseFormattedAddress(address);
    if (parsed) {
      setAddress(parsed);
    } else {
      runFetch(address);
    }
  }

  const nextUpIndex = dates?.findIndex((d) => d.days_remaining >= 0) ?? -1;
  const hasResults = dates !== null || error;

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <AddressSummary />
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div
          className="hidden md:block shrink-0 transition-[width] duration-500 ease-in-out"
          style={{ width: hasResults ? "0px" : "calc(50% - 160px)" }}
        />
        <div className="bg-white rounded-2xl shadow-md p-8 shrink-0 w-full md:w-80">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            <FormattedMessage id="dates.title" />
          </h1>
          <p className="text-gray-500 mb-6 text-sm">
            <FormattedMessage id="dates.subtitle" />
          </p>
          <AddressForm
            onSubmit={handleSubmit}
            loading={loading}
            submitLabel={intl.formatMessage({ id: "dates.submit" })}
            loadingLabel={intl.formatMessage({ id: "dates.submitting" })}
          />
        </div>

        {hasResults && (
          <div className="flex-1 min-w-0 animate-fade-slide-in">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {dates && dates.length === 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6 text-sm text-gray-500 text-center">
                <FormattedMessage id="dates.noResults" />
              </div>
            )}

            {dates && dates.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                {dates.map((item, i) => (
                  <DateCard key={`${item.category}-${item.date}`} item={item} isNextUp={i === nextUpIndex} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
