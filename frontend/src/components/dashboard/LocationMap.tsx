import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Search, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TILE_URL = "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png";
const TILE_ATTR = "&copy; Kartverket";
const DEFAULT_CENTER: [number, number] = [60.472, 8.4689];
const DEFAULT_ZOOM = 5;
const LOCATION_ZOOM = 13;

interface LocationData {
  name: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  location: LocationData;
  onChange: (loc: LocationData) => void;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

async function searchPlaces(query: string): Promise<Suggestion[]> {
  if (query.trim().length < 2) return [];
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
    countrycodes: "no",
    addressdetails: "1",
  });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "Accept-Language": "nn,no,en" },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export function LocationMap({ location, onChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const [query, setQuery] = useState(location.name);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const placeMarker = useCallback((lat: number, lng: number) => {
    const L = leafletRef.current;
    const map = mapInstance.current;
    if (!L || !map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({
        className: "",
        html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 1C7.373 1 2 6.373 2 13c0 9.198 12 25 12 25s12-15.802 12-25C26 6.373 20.627 1 14 1Z" fill="#0ea5e9" stroke="#ffffff" stroke-width="2"/>
          <circle cx="14" cy="13" r="4.5" fill="#ffffff"/>
        </svg>`,
        iconSize: [28, 40],
        iconAnchor: [14, 38],
      });
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!mapRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;

      leafletRef.current = L;

      const center: [number, number] =
        location.lat != null && location.lng != null
          ? [location.lat, location.lng]
          : DEFAULT_CENTER;
      const zoom = location.lat != null ? LOCATION_ZOOM : DEFAULT_ZOOM;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView(center, zoom);

      L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
      mapInstance.current = map;

      if (location.lat != null && location.lng != null) {
        placeMarker(location.lat, location.lng);
      }

      // Click to set location
      let clickTimer: ReturnType<typeof setTimeout> | null = null;
      map.on("click", (e: L.LeafletMouseEvent) => {
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          const lat = Number(e.latlng.lat.toFixed(6));
          const lng = Number(e.latlng.lng.toFixed(6));
          placeMarker(lat, lng);
          const name = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          setQuery(name);
          setSuggestions([]);
          onChange({ name, lat, lng });
        }, 220);
      });
      map.on("dblclick", () => {
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
      });

      setReady(true);
      setTimeout(() => map.invalidateSize(), 50);
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external location changes to map
  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    if (location.lat != null && location.lng != null) {
      mapInstance.current.setView([location.lat, location.lng], LOCATION_ZOOM, { animate: false });
      placeMarker(location.lat, location.lng);
    }
  }, [location.lat, location.lng, ready, placeMarker]);

  // Resize map when expanded toggles
  useEffect(() => {
    if (ready && mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 80);
    }
  }, [expanded, ready]);

  // Debounced search
  const handleInput = (value: string) => {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchPlaces(value);
      setSuggestions(results);
      setSearching(false);
    }, 300);
  };

  const selectSuggestion = (s: Suggestion) => {
    const lat = Number(Number(s.lat).toFixed(6));
    const lng = Number(Number(s.lon).toFixed(6));
    const name = s.display_name.split(",").slice(0, 3).join(", ");
    setQuery(name);
    setSuggestions([]);
    onChange({ name, lat, lng });

    if (mapInstance.current) {
      mapInstance.current.setView([lat, lng], LOCATION_ZOOM, { animate: true });
      placeMarker(lat, lng);
    }
  };

  const coords =
    location.lat != null && location.lng != null
      ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
      : null;

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-hydro-500" />
          <h2 className="text-lg font-semibold text-hydro-900">Lokasjon</h2>
        </div>
        {coords && (
          <span className="text-xs text-hydro-700 font-mono">{coords}</span>
        )}
      </div>

      {/* Search */}
      <div ref={wrapperRef} className="relative mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hydro-300" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) {
                selectSuggestion(suggestions[0]);
              }
            }}
            placeholder="Søk etter stad…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-hydro-200 bg-white/60 text-sm text-hydro-900 focus:ring-2 focus:ring-hydro-400 focus:outline-none"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-hydro-300 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute z-[600] mt-1 w-full bg-white rounded-xl shadow-lg border border-hydro-100 overflow-hidden">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-3 py-2 text-sm text-hydro-800 hover:bg-hydro-50 transition-colors"
                >
                  {s.display_name.split(",").slice(0, 3).join(", ")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Map */}
      <div className={cn(
        "relative overflow-hidden rounded-xl border border-hydro-200 bg-hydro-100 transition-all duration-300",
        expanded ? "h-[420px]" : "h-[220px]"
      )}>
        <div ref={mapRef} className="h-full w-full" />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="absolute right-3 top-3 z-[540] inline-flex items-center gap-1.5 rounded-full border border-hydro-200 bg-white/95 px-2.5 py-1 text-xs font-medium text-hydro-700 shadow-sm hover:bg-white transition-colors"
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          {expanded ? "Mindre" : "Større"}
        </button>
      </div>

      {location.name && (
        <p className="mt-2 text-xs text-hydro-700 truncate">
          {location.name}
        </p>
      )}
    </div>
  );
}
