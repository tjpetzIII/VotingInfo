interface PollingLocation {
  name: string | null;
  address: string | null;
  hours: string | null;
  location_name: string | null;
}

interface Props {
  location: PollingLocation;
}

export default function PollingLocationCard({ location }: Props) {
  const displayName =
    location.location_name ?? location.name ?? "Polling Location";

  const mapsUrl = location.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3">
      <div>
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

      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Get Directions →
        </a>
      )}
    </div>
  );
}
