import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { isUsableCoordinates } from "@/lib/mutah/coordinates";
import { useLang } from "@/lib/mutah/i18n";
import { loadMapLibre } from "@/lib/mutah/maplibre-client";
import { Button } from "./ui";

const TILE_URL =
  import.meta.env["VITE_MAP_TILE_URL"] || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const cache = new Map<string, SearchResult[]>();
let lastRequest = 0;
type SearchResult = { place_id: number; display_name: string; lat: string; lon: string };

export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number, label?: string) => void;
}) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const host = useRef<HTMLDivElement>(null);
  const initialLocation = useRef({ latitude, longitude });
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    let cancelled = false;
    void loadMapLibre().then(({ Map, Marker, NavigationControl }) => {
      if (cancelled || !host.current) return;
      const initial = initialLocation.current;
      const hasInitialLocation = isUsableCoordinates({
        latitude: initial.latitude ?? Number.NaN,
        longitude: initial.longitude ?? Number.NaN,
      });
      const center: [number, number] = hasInitialLocation
        ? [initial.longitude!, initial.latitude!]
        : [46.6753, 24.7136];
      const map = new Map({
        container: host.current,
        center,
        zoom: hasInitialLocation ? 15 : 10,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [TILE_URL],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      const setMarker = (lng: number, lat: number) => {
        markerRef.current?.remove();
        markerRef.current = new Marker({ draggable: true }).setLngLat([lng, lat]).addTo(map);
        markerRef.current.on("dragend", () => {
          const point = markerRef.current!.getLngLat();
          changeRef.current(point.lat, point.lng);
        });
      };
      if (hasInitialLocation) setMarker(initial.longitude!, initial.latitude!);
      map.on("click", (event) => {
        setMarker(event.lngLat.lng, event.lngLat.lat);
        changeRef.current(event.lngLat.lat, event.lngLat.lng);
      });
    });
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const coordinates = {
      latitude: latitude ?? Number.NaN,
      longitude: longitude ?? Number.NaN,
    };
    if (!isUsableCoordinates(coordinates) || !mapRef.current) return;
    markerRef.current?.setLngLat([coordinates.longitude, coordinates.latitude]);
    mapRef.current.easeTo({
      center: [coordinates.longitude, coordinates.latitude],
      zoom: Math.max(14, mapRef.current.getZoom()),
    });
  }, [latitude, longitude]);

  const search = async () => {
    const key = `${lang}:${query.trim().toLowerCase()}`;
    if (!query.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      let rows = cache.get(key);
      if (!rows) {
        const wait = Math.max(0, 1000 - (Date.now() - lastRequest));
        if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
        lastRequest = Date.now();
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=${lang}&q=${encodeURIComponent(query.trim())}`,
        );
        if (!response.ok) throw new Error("SEARCH_FAILED");
        rows = (await response.json()) as SearchResult[];
        cache.set(key, rows);
      }
      setResults(rows);
      if (!rows.length)
        setMessage(
          ar ? "لا نتائج. اختر الموقع من الخريطة." : "No results. Select the location on the map.",
        );
    } catch {
      setMessage(
        ar
          ? "تعذر البحث. ما زال بإمكانك اختيار الموقع من الخريطة."
          : "Search is unavailable. You can still select the location on the map.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label={ar ? "اختيار الموقع" : "Choose location"}>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <input
          className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-input bg-background px-3"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ar ? "ابحث باسم المكان أو العنوان" : "Search place name or address"}
        />
        <Button type="submit" variant="outline" disabled={busy}>
          <Search className="size-4" />
          {ar ? "بحث" : "Search"}
        </Button>
      </form>
      {message ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
      {results.length ? (
        <ul className="mt-2 max-h-40 overflow-auto rounded-xl border border-border bg-background">
          {results.map((result) => (
            <li key={result.place_id}>
              <button
                type="button"
                className="min-h-11 w-full border-b border-border px-3 py-2 text-start text-sm hover:bg-muted"
                onClick={() => {
                  const lat = Number(result.lat);
                  const lng = Number(result.lon);
                  if (isUsableCoordinates({ latitude: lat, longitude: lng })) {
                    onChange(lat, lng, result.display_name);
                    setResults([]);
                  }
                }}
              >
                {result.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div ref={host} className="mt-3 h-72 overflow-hidden rounded-xl border border-border" />
      <p className="mt-2 text-xs text-muted-foreground">
        {ar
          ? "ابحث عند الإرسال فقط، ثم انقر الخريطة أو حرّك العلامة. البحث وبيانات الخريطة © OpenStreetMap."
          : "Search runs only when submitted; then click the map or drag the marker. Search and map data © OpenStreetMap."}
      </p>
    </section>
  );
}
