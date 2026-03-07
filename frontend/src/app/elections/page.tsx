"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useIntl, FormattedMessage } from "react-intl";
import { fetchElections, type ContestDetail } from "@/lib/api";

function ElectionsContent() {
  const intl = useIntl();
  const searchParams = useSearchParams();
  const initialAddress = searchParams.get("address") ?? "";

  const [inputValue, setInputValue] = useState(initialAddress);
  const [address, setAddress] = useState(initialAddress);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["elections", address],
    queryFn: () => fetchElections(address),
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setAddress(trimmed);
    const url = new URL(window.location.href);
    url.searchParams.set("address", trimmed);
    window.history.pushState({}, "", url.toString());
  }

  function handleShare() {
    const url = new URL(window.location.href);
    url.searchParams.set("address", address);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        <FormattedMessage id="elections.title" />
      </h1>
      <p className="text-gray-500 mb-8 text-sm">
        <FormattedMessage id="elections.subtitle" />
      </p>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={intl.formatMessage({ id: "elections.placeholder" })}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
        >
          <FormattedMessage id="elections.search" />
        </button>
      </form>

      {isLoading && <LoadingSkeleton />}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {(error as Error).message}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                <FormattedMessage id="elections.electionLabel" />
              </p>
              <p className="font-semibold text-gray-900">{data.election.name}</p>
              <p className="text-sm text-gray-500">{data.election.election_day}</p>
            </div>
            <button
              onClick={handleShare}
              className="flex-shrink-0 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-4 py-2 rounded-lg transition-colors"
            >
              {copied
                ? intl.formatMessage({ id: "elections.copied" })
                : intl.formatMessage({ id: "elections.share" })}
            </button>
          </div>

          {data.contests.length === 0 ? (
            <p className="text-gray-500 text-sm">
              <FormattedMessage id="elections.noContests" />
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.contests.map((contest) => (
                <ContestCard key={contest.id} contest={contest} address={address} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContestCard({ contest, address }: { contest: ContestDetail; address: string }) {
  const intl = useIntl();
  const title = [contest.office, contest.district].filter(Boolean).join(" — ");
  return (
    <Link
      href={`/elections/${contest.id}?address=${encodeURIComponent(address)}`}
      className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-shadow flex flex-col gap-2"
    >
      <h2 className="font-semibold text-gray-900 leading-snug">
        {title || intl.formatMessage({ id: "elections.unnamedContest" })}
      </h2>
      <p className="text-sm text-gray-500">
        {intl.formatMessage(
          { id: "elections.candidateCount" },
          { count: contest.candidates.length }
        )}
      </p>
      <span className="mt-auto text-blue-600 text-sm font-medium">
        <FormattedMessage id="elections.viewCandidates" />
      </span>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-56" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-200 rounded-2xl h-28" />
        ))}
      </div>
    </div>
  );
}

export default function ElectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>
      }
    >
      <ElectionsContent />
    </Suspense>
  );
}
