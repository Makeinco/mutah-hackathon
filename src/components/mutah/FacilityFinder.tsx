import { LocateFixed, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { isUsableCoordinates } from "@/lib/mutah/coordinates";
import { useLang } from "@/lib/mutah/i18n";
import type { Facility } from "@/lib/mutah/types";
import { SchematicMap } from "./SchematicMap";
import { Button } from "./ui";

function haversine(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function FacilityFinder({
  facilities,
  value,
  onChange,
  onMissing,
}: {
  facilities: Facility[];
  value: string;
  onChange: (id: string) => void;
  onMissing: () => void;
}) {
  const { lang, pick } = useLang();
  const ar = lang === "ar";
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoMessage, setGeoMessage] = useState("");
  const shown = useMemo(
    () =>
      facilities
        .filter((facility) =>
          `${facility.name.ar} ${facility.name.en} ${facility.area.ar} ${facility.area.en}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((facility) => ({
          facility,
          distance:
            isUsableCoordinates(location) && isUsableCoordinates(facility.coordinates)
              ? haversine(location, facility.coordinates)
              : null,
        }))
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)),
    [facilities, query, location],
  );
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (isUsableCoordinates(nextLocation)) {
          setLocation(nextLocation);
          setGeoMessage("");
        } else {
          setGeoMessage(
            ar
              ? "تعذر تحديد موقع صالح. يمكنك البحث أو استخدام الخريطة."
              : "A valid location was not available. Search or use the map instead.",
          );
        }
      },
      () =>
        setGeoMessage(
          ar
            ? "لم يُسمح بالموقع. يمكنك البحث أو استخدام الخريطة."
            : "Location was not available. Search or use the map instead.",
        ),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  return (
    <div>
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-3.5 size-5 text-muted-foreground" />
          <span className="sr-only">{ar ? "بحث باسم المرفق" : "Search by facility name"}</span>
          <input
            className="min-h-12 w-full rounded-xl border-2 border-input bg-background ps-11 pe-3"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ar ? "ابحث باسم المرفق" : "Search facility name"}
          />
        </label>
        <Button type="button" variant="outline" onClick={locate}>
          <LocateFixed className="size-4" />
          {ar ? "بالقرب مني" : "Nearby"}
        </Button>
      </div>
      {geoMessage ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {geoMessage}
        </p>
      ) : null}
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
        <ul className="max-h-[22rem] overflow-auto rounded-xl border border-border bg-background">
          {shown.map(({ facility, distance }) => (
            <li key={facility.id}>
              <button
                type="button"
                aria-pressed={value === facility.id}
                onClick={() => onChange(facility.id)}
                className={`min-h-14 w-full border-b border-border px-3 py-2 text-start hover:bg-muted ${value === facility.id ? "bg-primary-soft" : ""}`}
              >
                <span className="block font-semibold">{pick(facility.name)}</span>
                <span className="text-xs text-muted-foreground">
                  {pick(facility.area)}
                  {distance != null
                    ? ` · ${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
          {!shown.length ? (
            <li className="p-4 text-sm text-muted-foreground">
              {ar ? "لم نجد مرفقًا مطابقًا." : "No matching facility found."}
            </li>
          ) : null}
        </ul>
        <SchematicMap
          facilities={shown.map((item) => item.facility)}
          needs={[]}
          selectedId={value}
          onSelect={onChange}
        />
      </div>
      <Button type="button" variant="quiet" className="mt-3" onClick={onMissing}>
        {ar ? "المرفق غير موجود — اقترح مرفقًا جديدًا" : "Facility missing — propose a new one"}
      </Button>
    </div>
  );
}
