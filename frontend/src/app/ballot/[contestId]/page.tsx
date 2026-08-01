"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { useIntl, FormattedMessage } from "react-intl";
import CandidateCard from "@/components/CandidateCard";
import AddressSummary from "@/components/AddressSummary";
import { fetchBallot, findContestById } from "@/lib/api";
import { useAddress, formatAddress } from "@/contexts/AddressContext";

function candidateGridClass(count: number): string {
  return count >= 3 ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "grid grid-cols-1 md:grid-cols-2 gap-6";
}

function ContestCompareContent() {
  const intl = useIntl();
  const { contestId } = useParams<{ contestId: string }>();
  const searchParams = useSearchParams();
  const { address: savedAddress } = useAddress();
  // Prefer the ?address= URL param (drill-down / shareable link); fall back to the shared saved
  // address so the detail page doesn't show the "no address" state when one is already saved.
  const address =
    (searchParams.get("address") ?? "") ||
    (savedAddress ? formatAddress(savedAddress) : "");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ballot", address],
    queryFn: () => fetchBallot(address),
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  function handleShare() {
    const url = new URL(window.location.href);
    url.searchParams.set("address", address);
    navigator.clipboard.writeText(url.toString()).then(
      () => {
        setCopyFailed(false);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        setCopyFailed(true);
      }
    );
  }

  if (!address) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-gray-500 text-sm">
          <FormattedMessage id="ballot.noAddress" />{" "}
          <Link href="/ballot" className="text-blue-600 hover:underline">
            <FormattedMessage id="ballot.searchBallot" />
          </Link>
        </p>
      </div>
    );
  }

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {(error as Error).message}
        </div>
      </div>
    );
  }

  const contest = data ? findContestById(data.contests, contestId) : undefined;
  const backToBallotHref = `/ballot?address=${encodeURIComponent(address)}`;

  if (!contest) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-gray-500 text-sm">
          <FormattedMessage id="ballot.contestNotFound" />{" "}
          <Link href={backToBallotHref} className="text-blue-600 hover:underline">
            <FormattedMessage id="ballot.backToBallot" />
          </Link>
        </p>
      </div>
    );
  }

  const title =
    [contest.office, contest.district].filter(Boolean).join(" — ") ||
    intl.formatMessage({ id: "ballot.contestFallbackLabel" });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <Link
          href={backToBallotHref}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <FormattedMessage id="ballot.backToBallot" />
        </Link>

        <div className="flex items-center gap-3">
          {copied && (
            <span className="text-sm text-green-600">
              <FormattedMessage id="ballot.linkCopied" />
            </span>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="min-h-11 text-sm font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <FormattedMessage id="ballot.share" />
          </button>
        </div>
      </div>

      {copyFailed && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-sm">
          <p className="mb-1">
            <FormattedMessage id="ballot.shareCopyFailed" />
          </p>
          <input
            readOnly
            value={(() => {
              const url = new URL(window.location.href);
              url.searchParams.set("address", address);
              return url.toString();
            })()}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full text-xs bg-white border border-yellow-300 rounded px-2 py-1"
          />
        </div>
      )}

      <AddressSummary />

      <h1 className="text-3xl font-bold text-gray-900 mb-1">{title}</h1>
      {data && (
        <p className="text-sm text-gray-500 mb-8">
          {data.election.name} · {data.election.election_day}
        </p>
      )}

      {contest.candidates.length === 0 ? (
        <p className="text-gray-500 text-sm">
          <FormattedMessage id="ballot.noCandidatesFound" />
        </p>
      ) : (
        <div className={candidateGridClass(contest.candidates.length)}>
          {contest.candidates.map((candidate, i) => (
            <CandidateCard key={i} candidate={candidate} />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-28" />
      <div className="h-10 bg-gray-200 rounded w-96" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-200 rounded-2xl h-48" />
        ))}
      </div>
    </div>
  );
}

export default function ContestComparePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ContestCompareContent />
    </Suspense>
  );
}
