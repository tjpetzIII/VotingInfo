import type { PollingLocation } from "@/lib/api";
import { useIntl } from "react-intl";

interface Props {
  location: PollingLocation;
}

export default function PollingLocationCard({ location }: Props) {
  const intl = useIntl();
  const type = location.category === "early_voting" ? intl.formatMessage({ id: "polling.earlyVoting" }) : location.category === "ballot_drop_off" ? intl.formatMessage({ id: "polling.dropOff" }) : intl.formatMessage({ id: "polling.electionDay" });
  const displayName =
    location.location_name ?? location.name ?? "Polling Location";

  const mapsUrl = location.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3">
      <div>
        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">{type}</p>
        <h3 className="font-semibold text-gray-900 text-base">{displayName}</h3>
        {location.address && (
          <p className="text-sm text-gray-600 mt-1">{location.address}</p>
        )}
      </div>

      {location.hours && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Hours
          </p>
          <p className="text-sm text-gray-700 mt-0.5">{location.hours}</p>
        </div>
      )}
      {(location.start_date || location.end_date) && <p className="text-sm text-gray-700">{intl.formatMessage({ id: "polling.available" }, { start: location.start_date ?? "", end: location.end_date ?? "" })}</p>}
      {location.notes && <p className="text-sm text-gray-600">{location.notes}</p>}
      {!!location.services?.length && <p className="text-sm text-gray-600">{intl.formatMessage({ id: "polling.services" }, { services: location.services.join(", ") })}</p>}

      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto min-h-11 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Get Directions →
        </a>
      )}
    </div>
  );
}
