import { useIntl } from "react-intl";
import type { ResponseMetadata } from "@/lib/api";

/** Compact, plain-language disclosure for where a response came from. */
export default function DataSourceNote({ metadata, className }: { metadata?: ResponseMetadata; className?: string }) {
  const intl = useIntl();
  if (!metadata) return null;

  const source = intl.formatMessage({ id: `dataSource.${metadata.provenance}` });
  const freshness = metadata.freshness === "cached"
    ? intl.formatMessage({ id: "dataSource.cached" })
    : null;

  return (
    <p className={`text-xs text-gray-500 ${className ?? ""}`} role="status">
      {source}
      {freshness ? ` · ${freshness}` : ""}
      {metadata.fallback_used ? ` · ${intl.formatMessage({ id: "dataSource.fallback" })}` : ""}
    </p>
  );
}
