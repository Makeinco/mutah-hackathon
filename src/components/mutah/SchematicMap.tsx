import { Link } from "@tanstack/react-router";
import { LocateFixed, MapPinOff } from "lucide-react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { isUsableCoordinates, type Wgs84Coordinates } from "@/lib/mutah/coordinates";
import { decideFor, VERDICT_LABEL } from "@/lib/mutah/decision";
import { useLang } from "@/lib/mutah/i18n";
import { loadMapLibre } from "@/lib/mutah/maplibre-client";
import type { AccessNeed, Facility } from "@/lib/mutah/types";
import { AccessNeedIcon } from "./AccessNeedIcon";

const TILE_URL =
  import.meta.env["VITE_MAP_TILE_URL"] || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const VERDICT_MARK = {
  available: "✓",
  partial: "≈",
  not_available: "!",
  insufficient: "?",
} as const;
const VERDICT_CLASS = {
  available: "bg-access text-white",
  partial: "bg-primary text-white",
  not_available: "bg-caution text-black",
  insufficient: "bg-unknown text-foreground",
} as const;

function fitPoints(map: MapLibreMap, points: Wgs84Coordinates[]) {
  if (points.length === 0) return;
  if (points.length === 1) {
    const only = points[0];
    if (only) map.jumpTo({ center: [only.longitude, only.latitude], zoom: 14 });
    return;
  }
  const lngs = points.map((point) => point.longitude);
  const lats = points.map((point) => point.latitude);
  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    { padding: 56, maxZoom: 14, duration: 0 },
  );
}

export function SchematicMap({
  facilities,
  needs,
  selectedId,
  onSelect,
}: {
  facilities: Facility[];
  needs: AccessNeed[];
  selectedId?: string | undefined;
  onSelect?: (id: string) => void;
}) {
  const { pick, lang } = useLang();
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [userLocation, setUserLocation] = useState<Wgs84Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const located = useMemo(
    () =>
      facilities.filter((facility): facility is Facility & { coordinates: Wgs84Coordinates } =>
        isUsableCoordinates(facility.coordinates),
      ),
    [facilities],
  );
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    if (!host.current) return;
    if (located.length === 0 && !isUsableCoordinates(userLocation)) {
      setMapState("empty");
      return;
    }
    setMapState("loading");
    let cancelled = false;
    const markers: Marker[] = [];
    void loadMapLibre()
      .then(({ Map, Marker, NavigationControl }) => {
        if (cancelled || !host.current) return;
        const first = located[0]?.coordinates ?? userLocation;
        const map = new Map({
          container: host.current,
          center: first ? [first.longitude, first.latitude] : [46.6753, 24.7136],
          zoom: located.length || userLocation ? 11 : 9,
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
        map.once("load", () => {
          fitPoints(map, [
            ...located.map((facility) => facility.coordinates),
            ...(isUsableCoordinates(userLocation) ? [userLocation] : []),
          ]);
          setMapState("ready");
        });
        map.addControl(new NavigationControl({ showCompass: false }), "top-right");
        for (const facility of located) {
          const verdict = decideFor(facility, needs).verdict;
          const button = document.createElement("button");
          button.type = "button";
          button.className = `mutah-map-marker flex items-center justify-center border-2 border-white font-black ${VERDICT_CLASS[verdict]}`;
          button.dataset["facilityId"] = facility.id;
          const selected = facility.id === selectedIdRef.current;
          button.dataset["selected"] = String(selected);
          button.setAttribute("aria-pressed", String(selected));
          const mark = document.createElement("span");
          mark.textContent = VERDICT_MARK[verdict];
          button.append(mark);
          button.setAttribute(
            "aria-label",
            `${pick(facility.name)} — ${pick(VERDICT_LABEL[verdict])}`,
          );
          button.onclick = () => selectRef.current?.(facility.id);
          markers.push(
            new Marker({ element: button })
              .setLngLat([facility.coordinates.longitude, facility.coordinates.latitude])
              .addTo(map),
          );
        }
        if (isUsableCoordinates(userLocation)) {
          const marker = document.createElement("div");
          marker.className = "mutah-user-marker";
          marker.setAttribute("role", "img");
          marker.setAttribute("aria-label", lang === "ar" ? "موقعك" : "Your location");
          userMarkerRef.current = new Marker({ element: marker })
            .setLngLat([userLocation.longitude, userLocation.latitude])
            .addTo(map);
        }
      })
      .catch(() => {
        if (!cancelled) setMapState("error");
      });
    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.remove());
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [located, needs, pick, userLocation, lang]);

  const locateUser = () => {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage(
        lang === "ar"
          ? "الموقع غير متاح في هذا المتصفح. بقيت القائمة والخريطة متاحتين."
          : "Location is unavailable in this browser. The list and map remain available.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (!isUsableCoordinates(point)) return;
        setUserLocation(point);
      },
      () =>
        setLocationMessage(
          lang === "ar"
            ? "لم يُسمح بالموقع. يمكنك متابعة استخدام الخريطة والقائمة."
            : "Location was not allowed. You can continue using the map and list.",
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    const markerButtons = host.current?.querySelectorAll<HTMLButtonElement>(".mutah-map-marker");
    markerButtons?.forEach((button) => {
      const selected = button.dataset["facilityId"] === selectedId;
      button.dataset["selected"] = String(selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }, [selectedId, facilities]);

  const selected = facilities.find((facility) => facility.id === selectedId);
  return (
    <div className="mutah-surface overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-3 py-2">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground" role="status">
          {locationMessage ||
            (userLocation
              ? lang === "ar"
                ? "يظهر موقعك بعلامة زرقاء دائرية."
                : "Your location is shown with a round blue marker."
              : lang === "ar"
                ? "عرض الموقع اختياري ولا يبدأ إلا بطلبك."
                : "Location is optional and starts only when you request it.")}
        </p>
        <button
          type="button"
          onClick={locateUser}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LocateFixed className="size-4" aria-hidden="true" />
          {lang === "ar" ? "اعرض موقعي" : "Show my location"}
        </button>
      </div>
      {mapState !== "ready" ? (
        <div
          className="flex min-h-14 items-center justify-center border-b border-border bg-background px-4 text-sm text-muted-foreground"
          role="status"
        >
          {mapState === "loading"
            ? lang === "ar"
              ? "جاري تحميل الخريطة…"
              : "Loading map…"
            : mapState === "empty"
              ? lang === "ar"
                ? "لا تتوفر مواقع موثوقة لعرضها على الخريطة. استخدم القائمة لتصفح المرافق."
                : "No verified locations are available for the map. Use the list to browse facilities."
              : lang === "ar"
                ? "تعذر تحميل الخريطة. استخدم القائمة لعرض المرافق."
                : "The map could not load. Use the list to browse facilities."}
        </div>
      ) : null}
      {mapState === "empty" ? (
        <div className="flex min-h-[22rem] flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
          <MapPinOff className="size-8" aria-hidden="true" />
          <p className="max-w-md text-sm">
            {lang === "ar"
              ? "المرافق بلا إحداثيات صالحة تبقى متاحة في وضع القائمة، ولا نضعها في موقع تخميني."
              : "Facilities without valid coordinates remain available in List view; MUTAH does not place them at a guessed location."}
          </p>
        </div>
      ) : null}
      <div
        ref={host}
        className={mapState === "empty" ? "hidden" : "h-[22rem] w-full"}
        aria-label={lang === "ar" ? "خريطة المرافق" : "Facilities map"}
      />
      {mapState !== "empty" ? (
        <p className="border-t border-border bg-background px-4 py-2 text-xs text-muted-foreground">
          {lang === "ar"
            ? "الخريطة والقائمة تعرضان قرار الوصول نفسه. بيانات الخريطة © مساهمو OpenStreetMap."
            : "Map and list use the same access verdict. Map data © OpenStreetMap contributors."}
        </p>
      ) : null}
      {selected ? (
        <div className="border-t border-border bg-background p-4">
          <p className="font-bold">{pick(selected.name)}</p>
          <p className="text-sm text-muted-foreground">
            {pick(VERDICT_LABEL[decideFor(selected, needs).verdict])}
          </p>
          {!isUsableCoordinates(selected.coordinates) ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "ar"
                ? "الموقع الدقيق غير متاح لهذا المرفق؛ لم نضع علامة تخمينية."
                : "A precise location is unavailable for this facility; no estimated marker is shown."}
            </p>
          ) : null}
          {needs.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {needs.map((need) => (
                <li key={need} className="rounded-lg bg-primary-soft p-1.5 text-primary">
                  <AccessNeedIcon need={need} className="size-4" aria-hidden="true" />
                  <span className="sr-only">
                    {pick(VERDICT_LABEL[decideFor(selected, [need]).verdict])}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2 flex gap-4 text-sm font-semibold text-primary">
            <Link
              to="/facility/$id"
              params={{ id: selected.id }}
              className="inline-flex min-h-11 items-center rounded-lg px-2 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {lang === "ar" ? "التفاصيل" : "Details"}
            </Link>
            <Link
              to="/contribute/$facilityId"
              params={{ facilityId: selected.id }}
              className="inline-flex min-h-11 items-center rounded-lg px-2 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {lang === "ar" ? "ساهم" : "Contribute"}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
