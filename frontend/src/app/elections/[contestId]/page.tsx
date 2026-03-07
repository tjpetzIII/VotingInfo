"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { useIntl, FormattedMessage } from "react-intl";
import CandidateCard from "@/components/CandidateCard";
import { fetchElections } from "@/lib/api";

function ContestContent() {
  const intl = useIntl();
  const { contestId } = useParams<{ contestId: string }>();
  const searchParams = useSearchParams();
  const address = searchParams.get("address") ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["elections", address],
    queryFn: () => fetchElections(address),
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!address) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-gray-500 text-sm">
          <FormattedMessage id="contest.noAddress" />{" "}
          <Link href="/elections" className="text-blue-600 hover:underline">
            <FormattedMessage id="contest.searchContests" />
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

  const id = parseInt(contestId, 10);
  const contest = data?.contests.find((c) => c.id === id);

  if (!contest) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-gray-500 text-sm">
          <FormattedMessage id="contest.notFound" />{" "}
          <Link
            href={`/elections?address=${encodeURIComponent(address)}`}
            className="text-blue-600 hover:underline"
          >
            <FormattedMessage id="contest.backToContests" />
          </Link>
        </p>
      </div>
    );
  }

  const title = [contest.office, contest.district].filter(Boolean).join(" — ");

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Link
        href={`/elections?address=${encodeURIComponent(address)}`}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-6"
      >
        <FormattedMessage id="contest.allContests" />
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-1">
        {title || intl.formatMessage({ id: "contest.defaultTitle" })}
      </h1>
      {data && (
        <p className="text-sm text-gray-500 mb-8">
          {data.election.name} · {data.election.election_day}
        </p>
      )}

      {contest.candidates.length === 0 ? (
        <p className="text-gray-500 text-sm">
          <FormattedMessage id="contest.noCandidates" />
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

export default function ContestPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ContestContent />
    </Suspense>
  );
}
