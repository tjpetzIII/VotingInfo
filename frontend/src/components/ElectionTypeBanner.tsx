"use client";

import { useEffect, useRef, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { classifyElectionType, type ElectionTypeCategory } from "@/lib/electionType";

const MESSAGE_IDS: Record<ElectionTypeCategory, { title: string; explanation: string }> = {
  primary: { title: "electionType.primary.title", explanation: "electionType.primary.explanation" },
  general: { title: "electionType.general.title", explanation: "electionType.general.explanation" },
  special: { title: "electionType.special.title", explanation: "electionType.special.explanation" },
  runoff: { title: "electionType.runoff.title", explanation: "electionType.runoff.explanation" },
  generic: { title: "electionType.generic.title", explanation: "electionType.generic.explanation" },
};

export default function ElectionTypeBanner({
  election,
}: {
  election: { id: string; name: string };
}) {
  const intl = useIntl();
  const category = classifyElectionType(election.name);
  const { title, explanation } = MESSAGE_IDS[category];

  const [expanded, setExpanded] = useState(true);
  const previousElectionId = useRef(election.id);

  // A different election means a different (and unread) explanation — always resurface it,
  // even if the voter had collapsed the explanation for a previously viewed election.
  useEffect(() => {
    if (previousElectionId.current !== election.id) {
      previousElectionId.current = election.id;
      setExpanded(true);
    }
  }, [election.id]);

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={intl.formatMessage({ id: "electionType.toggle" })}
        className="min-h-11 w-full flex items-center justify-between gap-2 text-left"
      >
        <h2 className="font-semibold text-blue-900">
          <FormattedMessage id={title} />
        </h2>
        <span className="text-blue-500 text-sm" aria-hidden>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <p className="mt-1 text-blue-800">
          <FormattedMessage id={explanation} />
        </p>
      )}
    </div>
  );
}
