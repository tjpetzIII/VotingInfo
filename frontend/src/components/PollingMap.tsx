"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface PollingLocation {
  name: string | null;
  address: string | null;
  hours: string | null;
  location_name: string | null;
}

interface GeocodedLocation extends PollingLocation {
  lat: number;
  lng: number;
}

interface Props {
  locations: PollingLocation[];
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

export default function PollingMap({ locations }: Props) {
  const [geocoded, setGeocoded] = useState<GeocodedLocation[]>([]);

  useEffect(() => {
    const geocodeAll = async () => {
      const results = await Promise.all(
        locations.map(async (loc) => {
          if (!loc.address) return null;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(loc.address)}`,
              { headers: { "User-Agent": "VoteReady/1.0" } }
            );
            const data = await res.json();
            if (!data[0]) return null;
            return {
              ...loc,
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            } as GeocodedLocation;
          } catch {
            return null;
          }
        })
      );
      setGeocoded(results.filter((r): r is GeocodedLocation => r !== null));
    };

    geocodeAll();
  }, [locations]);

  const first = geocoded[0];

  return (
    <div className="rounded-2xl overflow-hidden shadow-md h-80">
      <MapContainer
        center={first ? [first.lat, first.lng] : [39.8283, -98.5795]}
        zoom={first ? 13 : 4}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {first && <FlyTo lat={first.lat} lng={first.lng} />}

        {geocoded.map((loc, i) => (
          <CircleMarker
            key={i}
            center={[loc.lat, loc.lng]}
            radius={10}
            pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.9 }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">
                  {loc.location_name ?? loc.name ?? "Polling Location"}
                </p>
                {loc.address && <p className="text-gray-600 mt-0.5">{loc.address}</p>}
                {loc.hours && <p className="text-gray-500 mt-1">Hours: {loc.hours}</p>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
