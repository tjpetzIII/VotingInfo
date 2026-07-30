"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useIntl, FormattedMessage } from "react-intl";
import AddressForm from "@/components/AddressForm";
import AddressSummary from "@/components/AddressSummary";
import CandidateCard from "@/components/CandidateCard";
import { fetchBallot, type BallotContest, type BallotLevel } from "@/lib/api";
import {
  useAddress,
  formatAddress,
  parseFormattedAddress,
} from "@/contexts/AddressContext";

const LEVELS: BallotLevel[] = ["federal", "state", "local"];

const LEVEL_LABEL_ID: Record<BallotLevel, string> = {
  federal: "ballot.sectionFederal",
  state: "ballot.sectionState",
  local: "ballot.sectionLocal",
};

function groupByLevel(contests: BallotContest[]): Record<BallotLevel, BallotContest[]> {
  const grouped: Record<BallotLevel, BallotContest[]> = { federal: [], state: [], local: [] };
  for (const contest of contests) {
    grouped[contest.level].push(contest);
  }
  return grouped;
}

function BallotContent() {
  const intl = useIntl();
  const searchParams = useSearchParams();
  const urlAddress = searchParams.get("address") ?? "";
  const { address: savedAddress, setAddress: setSharedAddress } = useAddress();
  const [address, setAddress] = useState(urlAddress);
  const [expandedLevels, setExpandedLevels] = useState<Record<BallotLevel, boolean>>({
    federal: true,
    state: true,
    local: true,
  });

  // When no ?address= URL param is present, fall back to the shared saved address. The URL param,
  // when present, keeps precedence for that page load (existing shareable-link behavior, VOT-25).
  useEffect(() => {
    if (!urlAddress && savedAddress) {
      setAddress(formatAddress(savedAddress));
    }
  }, [urlAddress, savedAddress]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ballot", address],
    queryFn: () => fetchBallot(address),
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  function handleSubmit(submitted: string) {
    setAddress(submitted);
    const parsed = parseFormattedAddress(submitted);
    if (parsed) setSharedAddress(parsed);
  }

  function toggleLevel(level: BallotLevel) {
    setExpandedLevels((prev) => ({ ...prev, [level]: !prev[level] }));
  }

  const grouped = data ? groupByLevel(data.contests) : null;
  const hasNoContests = !!data && data.contests.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        <FormattedMessage id="ballot.title" />
      </h1>
      <p className="text-gray-500 mb-8 text-sm">
        <FormattedMessage id="ballot.subtitle" />
      </p>

      <div className="bg-white rounded-2xl shadow-md p-8 max-w-md">
        <AddressForm
          onSubmit={handleSubmit}
          loading={isLoading}
          submitLabel={intl.formatMessage({ id: "ballot.search" })}
          loadingLabel={intl.formatMessage({ id: "ballot.submitting" })}
        />
      </div>

      <div className="mt-6">
        <AddressSummary />
      </div>

      {isLoading && <LoadingSkeleton />}

      {error && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {(error as Error).message}
        </div>
      )}

      {data && hasNoContests && (
        <p className="mt-8 text-gray-500 text-sm">
          <FormattedMessage id="ballot.noBallotData" />
        </p>
      )}

      {grouped && !hasNoContests && (
        <div className="mt-8 flex flex-col gap-8">
          {LEVELS.filter((level) => grouped[level].length > 0).map((level) => (
            <BallotSection
              key={level}
              level={level}
              contests={grouped[level]}
              expanded={expandedLevels[level]}
              onToggle={() => toggleLevel(level)}
              address={address}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BallotSection({
  level,
  contests,
  expanded,
  onToggle,
  address,
}: {
  level: BallotLevel;
  contests: BallotContest[];
  expanded: boolean;
  onToggle: () => void;
  address: string;
}) {
  const intl = useIntl();
  const levelLabel = intl.formatMessage({ id: LEVEL_LABEL_ID[level] });
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={intl.formatMessage({ id: "ballot.toggleSection" }, { level: levelLabel })}
        className="w-full flex items-center justify-between gap-2 text-left border-b border-gray-200 pb-2"
      >
        <h2 className="text-xl font-semibold text-gray-900">{levelLabel}</h2>
        <span className="text-gray-400 text-sm" aria-hidden>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col gap-6">
          {contests.map((contest, i) => (
            <ContestBlock key={i} contest={contest} address={address} />
          ))}
        </div>
      )}
    </section>
  );
}

function ContestBlock({ contest, address }: { contest: BallotContest; address: string }) {
  const intl = useIntl();
  const title =
    [contest.office, contest.district].filter(Boolean).join(" — ") ||
    intl.formatMessage({ id: "ballot.contestFallbackLabel" });

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <Link
        href={`/ballot/${contest.id}?address=${encodeURIComponent(address)}`}
        className="text-lg font-semibold text-gray-900 mb-4 block hover:text-blue-700"
      >
        {title}
      </Link>

      {contest.candidates.length === 0 ? (
        <p className="text-gray-500 text-sm">
          <FormattedMessage id="ballot.noCandidatesFound" />
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    <div className="mt-8 space-y-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-40" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-200 rounded-2xl h-32" />
        ))}
      </div>
    </div>
  );
}

export default function BallotPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>
      }
    >
      <BallotContent />
    </Suspense>
  );
}
