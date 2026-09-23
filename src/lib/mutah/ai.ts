import { bi } from "./i18n";
import { ZONE_INDICATORS } from "./labels";
import type { Facility, IndicatorEvidence, L, ZoneKey } from "./types";

/**
 * AI provider adapter (mock).
 * Production will replace `analyseZoneImage` with a server-side provider call.
 * This demo adapter is intentionally conservative: it never invents a visual
 * feature that is not already represented by the facility's demo evidence.
 */

export interface AnalysisStep {
  id: string;
  label: L;
}

export const ANALYSIS_STEPS: AnalysisStep[] = [
  { id: "prepare", label: bi("جاري تجهيز الصور", "Preparing the images") },
  { id: "quality", label: bi("فحص جودة الصور", "Checking image quality") },
  { id: "privacy", label: bi("حماية الخصوصية", "Protecting privacy") },
  { id: "analyse", label: bi("تحليل العناصر الظاهرة", "Analysing visible features") },
  { id: "evidence", label: bi("تجهيز الأدلة للمراجعة", "Preparing evidence for review") },
];

const UNKNOWN_NOTE = bi(
  "لا يمكن تأكيد هذا العنصر من الأدلة التجريبية الحالية.",
  "This feature cannot be confirmed from the current demo evidence.",
);

/**
 * Deterministic demo analysis for one facility zone.
 * It mirrors only existing demo evidence for that zone. Anything unavailable
 * remains unknown. This prevents the prototype from hallucinating ramps,
 * handrails, elevators, restrooms, measurements, or compliance.
 */
export function analyseZoneImage(facility: Facility | undefined, zone: ZoneKey): IndicatorEvidence[] {
  const keys = ZONE_INDICATORS[zone];
  return keys.map((key) => {
    const evidence = facility?.indicators[key];
    if (!evidence) return { key, state: "unknown", note: UNKNOWN_NOTE };

    return {
      key,
      state: evidence.state,
      note: evidence.note,
    };
  });
}

/** Basic pre-checks shown to the user before analysis. */
export function checkImageQuality(): { ok: boolean; message: L } {
  return {
    ok: true,
    message: bi(
      "تم اجتياز فحص العرض التجريبي. في النسخة المتصلة سيُفحص كل ملف قبل التحليل.",
      "Demo pre-check passed. In the connected build, each file will be checked before analysis.",
    ),
  };
}
