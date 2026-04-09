"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Popup } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

type FoodSpot = {
  id: string;
  lat: number;
  lon: number;
  name: string;
  cuisine?: string;
  amenity: string;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

const RADIUS_INITIAL_M = 2000;
const RADIUS_EXPANDED_M = 3000;

function stadiaStyleUrl(): string {
  const key = process.env.NEXT_PUBLIC_STADIA_API_KEY ?? "";
  return `https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=${encodeURIComponent(key)}`;
}

function elementCoords(el: OverpassElement): { lat: number; lon: number } | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") {
    return { lat: el.lat, lon: el.lon };
  }
  if (
    el.center &&
    typeof el.center.lat === "number" &&
    typeof el.center.lon === "number"
  ) {
    return { lat: el.center.lat, lon: el.center.lon };
  }
  return null;
}

function parseSpots(data: OverpassResponse): FoodSpot[] {
  const elements = data.elements ?? [];
  const spots: FoodSpot[] = [];
  for (const el of elements) {
    if (el.type !== "node" && el.type !== "way" && el.type !== "relation") {
      continue;
    }
    const amenity = el.tags?.amenity;
    if (amenity !== "restaurant" && amenity !== "fast_food") {
      continue;
    }
    const coords = elementCoords(el);
    if (!coords) {
      continue;
    }
    const idKey = `${el.type}-${el.id}`;
    const name = el.tags?.name?.trim() || "Unnamed place";
    const cuisine = el.tags?.cuisine?.trim();
    spots.push({
      id: idKey,
      lat: coords.lat,
      lon: coords.lon,
      name,
      cuisine: cuisine || undefined,
      amenity,
    });
  }
  return spots;
}

async function fetchNearbyFood(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<FoodSpot[]> {
  const res = await fetch("/api/overpass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng, radiusM }),
  });

  const payload = (await res.json()) as OverpassResponse & { error?: string };

  if (!res.ok) {
    throw new Error(
      typeof payload.error === "string" && payload.error.trim()
        ? payload.error
        : `Overpass request failed (${res.status})`,
    );
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    throw new Error(payload.error);
  }

  return parseSpots(payload);
}

async function searchFoodIncremental(lat: number, lng: number): Promise<FoodSpot[]> {
  let results = await fetchNearbyFood(lat, lng, RADIUS_INITIAL_M);
  if (results.length === 0) {
    results = await fetchNearbyFood(lat, lng, RADIUS_EXPANDED_M);
  }
  return results;
}

function OrangePin() {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      aria-hidden
      className="drop-shadow-md"
    >
      <circle cx={14} cy={14} r={10} fill="#ea580c" stroke="#fff" strokeWidth={2} />
      <circle cx={14} cy={11} r={3} fill="#fff" opacity={0.9} />
    </svg>
  );
}

export default function NearbyFoodMap() {
  const mapRef = useRef<MapRef>(null);
  const pendingFlyToRef = useRef<[number, number] | null>(null);
  const markerClickRef = useRef(false);

  const [spots, setSpots] = useState<FoodSpot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [hasLocatedUser, setHasLocatedUser] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasStadiaKey] = useState(
    () => Boolean(process.env.NEXT_PUBLIC_STADIA_API_KEY?.trim()),
  );

  const [isMapEnabled, setIsMapEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("mapEnabled") === "true";
  });

  useEffect(() => {
    localStorage.setItem("mapEnabled", String(isMapEnabled));
  }, [isMapEnabled]);

  const geoStarted = useRef(false);
  const mapStyle = useMemo(() => stadiaStyleUrl(), []);

  const flyToUser = useCallback((longitude: number, latitude: number) => {
    pendingFlyToRef.current = [longitude, latitude];
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 14,
      });
      pendingFlyToRef.current = null;
    }
  }, []);

  const flushPendingFlyTo = useCallback(() => {
    const pending = pendingFlyToRef.current;
    if (pending && mapRef.current) {
      mapRef.current.flyTo({
        center: pending,
        zoom: 14,
      });
      pendingFlyToRef.current = null;
    }
  }, []);

  const runSearchAtMapCenter = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) {
      setFetchError("Map is not ready yet.");
      return;
    }
    const c = map.getCenter();
    const lat = c.lat;
    const lng = c.lng;

    setFetchLoading(true);
    setFetchError(null);
    setHasSearched(true);
    setSelectedId(null);
    try {
      const next = await searchFoodIncremental(lat, lng);
      setSpots(next);
    } catch (e) {
      setFetchError(
        e instanceof Error ? e.message : "Could not load nearby places.",
      );
      setSpots([]);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGeoError(null);
        setHasLocatedUser(true);
        flyToUser(longitude, latitude);
      },
      (err) => {
        const message =
          err.code === 1
            ? "Location access denied. Enable location to see nearby food spots on the map."
            : err.code === 2
              ? "Your location could not be determined."
              : err.code === 3
                ? "Location request timed out."
                : "Could not access your location.";
        setGeoError(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [flyToUser]);

  const handleMapLoad = useCallback(() => {
    if (!hasStadiaKey || geoStarted.current) {
      return;
    }
    geoStarted.current = true;
    requestUserLocation();
    queueMicrotask(() => {
      flushPendingFlyTo();
    });
  }, [hasStadiaKey, requestUserLocation, flushPendingFlyTo]);

  const handleMapClick = useCallback(() => {
    if (markerClickRef.current) {
      return;
    }
    setSelectedId(null);
  }, []);

  const handleMarkerSelect = useCallback((spotId: string) => {
    markerClickRef.current = true;
    setSelectedId(spotId);
    requestAnimationFrame(() => {
      markerClickRef.current = false;
    });
  }, []);

  const selectedSpot = selectedId != null ? spots.find((s) => s.id === selectedId) : undefined;

  const showNoResults =
    hasSearched &&
    !fetchLoading &&
    !fetchError &&
    spots.length === 0;

  return (
    <div className="relative h-[50vh] w-full overflow-hidden rounded-3xl border border-[#d7dee2] bg-[#e8edf1]">

      <div className="absolute top-3 right-3 z-30">
        <button
          onClick={() => setIsMapEnabled((prev) => !prev)}
          className="rounded-full bg-[#0d2e38] px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-[#0a252c] transition"
        >
          {isMapEnabled ? "Disable Map" : "Load Map"}
        </button>
      </div>

      {!hasStadiaKey && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-6 text-center text-sm text-[#5c6f78]">
          <p>
            Set <code className="rounded bg-[#f0f2f4] px-1.5 py-0.5">NEXT_PUBLIC_STADIA_API_KEY</code>{" "}
            in <code className="rounded bg-[#f0f2f4] px-1.5 py-0.5">.env.local</code> to load the map.
          </p>
        </div>
      )}

      {hasStadiaKey && !isMapEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#e8edf1] text-center px-4">
          <p className="text-sm text-[#5c6f78] mb-3">
            Map is turned off to save data usage.
          </p>
          <button
            onClick={() => setIsMapEnabled(true)}
            className="rounded-2xl bg-[#0d2e38] px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#0a252c] transition"
          >
            Load Map
          </button>
        </div>
      )}

      {hasStadiaKey && isMapEnabled && (
        <Map
          ref={mapRef}
          mapStyle={mapStyle}
          initialViewState={{
            longitude: -98.5795,
            latitude: 39.8283,
            zoom: 3.5,
            bearing: 0,
            pitch: 0,
          }}
          style={{ width: "100%", height: "100%" }}
          onLoad={handleMapLoad}
          onClick={handleMapClick}
        >
          {spots.map((spot) => (
            <Marker
              key={spot.id}
              longitude={spot.lon}
              latitude={spot.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerSelect(spot.id);
              }}
            >
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0"
                aria-label={spot.name}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkerSelect(spot.id);
                }}
              >
                <OrangePin />
              </button>
            </Marker>
          ))}

          {selectedSpot && (
            <Popup
              longitude={selectedSpot.lon}
              latitude={selectedSpot.lat}
              anchor="bottom"
              offset={24}
              onClose={() => setSelectedId(null)}
              closeButton
              closeOnClick={false}
            >
              <div className="min-w-[180px] max-w-[240px] p-1 text-[#0d2e38]">
                <p className="font-semibold">{selectedSpot.name}</p>
                <p className="mt-1 text-sm text-[#6a7f87]">
                  {selectedSpot.cuisine ? (
                    <>Cuisine: {selectedSpot.cuisine}</>
                  ) : (
                    <>Cuisine: —</>
                  )}
                </p>
              </div>
            </Popup>
          )}
        </Map>
      )}

      {hasStadiaKey && isMapEnabled && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-stretch gap-2 p-4 pb-3">
          <button
            type="button"
            onClick={() => void runSearchAtMapCenter()}
            disabled={fetchLoading}
            className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl bg-[#0d2e38] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0a252c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {fetchLoading ? "Searching…" : "Search for Food Nearby"}
          </button>

          {(geoError || fetchError || fetchLoading || showNoResults) && (
            <div className="flex w-full flex-col gap-2">
              {geoError && (
                <div className="pointer-events-auto rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
                  {geoError}
                </div>
              )}
              {fetchLoading && (
                <div className="pointer-events-auto rounded-2xl border border-[#d7dee2] bg-white/95 px-4 py-2 text-center text-sm text-[#5c6f78] shadow-sm">
                  Loading nearby food spots…
                </div>
              )}
              {fetchError && (
                <div className="pointer-events-auto rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 shadow-sm">
                  {fetchError}
                </div>
              )}
              {showNoResults && (
                <div className="pointer-events-auto rounded-2xl border border-[#d7dee2] bg-white/95 px-4 py-3 text-sm text-[#5c6f78] shadow-sm">
                  No restaurant or fast-food POIs found in OpenStreetMap for this map area (tried up to{" "}
                  {RADIUS_EXPANDED_M}m).
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hasStadiaKey && isMapEnabled && !geoError && !hasLocatedUser && !hasSearched && !fetchLoading && (
        <p className="pointer-events-none absolute left-4 right-4 top-3 z-10 rounded-2xl bg-white/95 px-3 py-2 text-center text-xs text-[#5c6f78] shadow-sm">
          Pan the map if needed, then tap <span className="font-semibold">Search for Food Nearby</span>.
        </p>
      )}
    </div>
  );
}
