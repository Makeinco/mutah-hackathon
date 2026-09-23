import { bi } from "./i18n";
import { isUsableCoordinates } from "./coordinates";
import { INDICATOR_ZONE, ZONE_ORDER } from "./labels";
import type {
  EvidenceImage,
  Facility,
  IndicatorEvidence,
  IndicatorKey,
  IndicatorState,
  ZoneEvidence,
  ZoneKey,
} from "./types";

const DEFAULT_SUPABASE_URL = "https://lxwwdobvlysgqdgixniv.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_L-E_exDU3r8nhA5xz3gb4w_EzqgXiIv";

function config() {
  const url = import.meta.env["VITE_SUPABASE_URL"] || DEFAULT_SUPABASE_URL;
  // Supabase publishable keys are intentionally browser-safe. Environment values
  // still override this project-scoped fallback to support rotation/deploy targets.
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url: url.replace(/\/$/, ""), key };
}

export type ReviewedFacilityRow = {
  id: string;
  external_key: string | null;
  name_ar: string;
  name_en: string | null;
  category_ar: string | null;
  category_en: string | null;
  area_ar: string | null;
  area_en: string | null;
  latitude: number | null;
  longitude: number | null;
  source: "mutah_admin" | "volunteer" | "facility_owner";
  verification: "team_reviewed" | "stale";
  last_verified_at: string | null;
  official_image_path: string | null;
};

const INDICATOR_KEYS: IndicatorKey[] = [
  "path_surface",
  "curb_ramp",
  "steps",
  "ramp",
  "handrail",
  "obstruction",
  "parking",
  "parking_route",
  "elevator",
  "elevator_space",
  "accessible_restroom",
  "restroom_door",
];

const EVIDENCE_STATES = new Set<IndicatorState>([
  "present",
  "absent",
  "unknown",
  "not_visible",
  "not_documented",
  "conflicting",
  "not_applicable",
]);

function isEvidenceState(value: unknown): value is IndicatorState {
  return typeof value === "string" && EVIDENCE_STATES.has(value as IndicatorState);
}

function positionFor(id: string) {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return { x: 0.15 + (hash % 70) / 100, y: 0.15 + ((hash >>> 8) % 70) / 100 };
}

function publicArea(value: string | null) {
  if (!value) return "";
  const withoutPlusCode = value
    .replace(/\b[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/giu, "")
    .replace(/^\s*[,·–—-]\s*|\s*[,·–—-]\s*$/g, "")
    .trim();
  return withoutPlusCode;
}

function toFacility(row: ReviewedFacilityRow, summary?: ReviewedSummaryRow): Facility {
  const evidence = summary?.reviewed_evidence ?? {};
  const fallback = bi(
    "لا توجد أدلة مرئية مراجعة لهذا العنصر بعد.",
    "There is no reviewed visual evidence for this feature yet.",
  );
  const indicators = Object.fromEntries(
    INDICATOR_KEYS.map((key) => {
      const item = evidence[key];
      const state = isEvidenceState(item?.state) ? item.state : "not_documented";
      return [
        key,
        {
          key,
          state,
          note: item
            ? bi(item.explanation_ar || fallback.ar, item.explanation_en || fallback.en)
            : fallback,
        } satisfies IndicatorEvidence,
      ];
    }),
  ) as Facility["indicators"];

  const zones = Object.fromEntries(
    ZONE_ORDER.map((zone) => {
      const documented = INDICATOR_KEYS.some(
        (key) => INDICATOR_ZONE[key] === zone && indicators[key].state !== "not_documented",
      );
      return [
        zone,
        { key: zone, images: [] as EvidenceImage[], documented } satisfies ZoneEvidence,
      ];
    }),
  ) as Record<ZoneKey, ZoneEvidence>;

  const coordinates = {
    latitude: row.latitude ?? Number.NaN,
    longitude: row.longitude ?? Number.NaN,
  };

  return {
    id: row.external_key || row.id,
    databaseId: row.id,
    name: bi(row.name_ar, row.name_en || row.name_ar),
    category: bi(row.category_ar || "مرفق", row.category_en || "Facility"),
    area: bi(publicArea(row.area_ar), publicArea(row.area_en || row.area_ar)),
    point: positionFor(row.id),
    ...(isUsableCoordinates(coordinates) ? { coordinates } : {}),
    imageUrl: row.official_image_path
      ? `${config().url}/storage/v1/object/public/mutah-public-facility-media/${encodeURI(row.official_image_path)}`
      : "",
    imageAlt: bi(
      `الصورة الرسمية لـ ${row.name_ar}`,
      `Official photo of ${row.name_en || row.name_ar}`,
    ),
    lastVerifiedISO: row.last_verified_at || summary?.last_recomputed_at || "",
    verification: row.verification,
    source: row.source === "mutah_admin" ? "team_survey" : "contributor_image",
    indicators,
    zones,
  };
}

export type ReviewedSummaryRow = {
  facility_id: string;
  reviewed_evidence: Record<
    string,
    {
      state?: IndicatorState;
      explanation_ar?: string;
      explanation_en?: string;
    }
  >;
  evidence_status: Record<string, unknown>;
  last_recomputed_at: string;
};

async function rest<T>(path: string): Promise<T> {
  const { url, key } = config();

  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`SUPABASE_HTTP_${response.status}`);
  }

  return (await response.json()) as T;
}

/**
 * Public read path only. RLS guarantees that the browser can read reviewed/stale
 * facility data, never the internal analysis/moderation tables.
 */
export async function loadReviewedFacilities(): Promise<ReviewedFacilityRow[]> {
  return rest<ReviewedFacilityRow[]>(
    "facilities?select=id,external_key,name_ar,name_en,category_ar,category_en,area_ar,area_en,latitude,longitude,source,verification,last_verified_at,official_image_path&order=updated_at.desc",
  );
}

export async function loadReviewedFacilityModels(): Promise<Facility[]> {
  const [facilities, summaries] = await Promise.all([
    loadReviewedFacilities(),
    loadReviewedSummaries(),
  ]);
  const summariesByFacility = new Map(summaries.map((summary) => [summary.facility_id, summary]));
  return facilities.map((facility) => toFacility(facility, summariesByFacility.get(facility.id)));
}

export async function loadReviewedSummaries(): Promise<ReviewedSummaryRow[]> {
  return rest<ReviewedSummaryRow[]>(
    "facility_summaries?select=facility_id,reviewed_evidence,evidence_status,last_recomputed_at",
  );
}

export async function checkSupabaseConnection(): Promise<"connected" | "unavailable"> {
  try {
    await loadReviewedFacilities();
    return "connected";
  } catch {
    return "unavailable";
  }
}
