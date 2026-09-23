import { bi } from "./i18n";
import type {
  AccessNeed,
  IndicatorKey,
  IndicatorState,
  L,
  Lang,
  VerificationStatus,
  ZoneKey,
} from "./types";

/* Zones -------------------------------------------------------------------- */

export const ZONE_ORDER: ZoneKey[] = ["approach", "entrance", "parking", "elevator", "restroom"];

export const ZONE_LABEL: Record<ZoneKey, L> = {
  approach: bi("مسار الوصول", "Approach path"),
  entrance: bi("المدخل", "Entrance"),
  parking: bi("المواقف", "Parking"),
  elevator: bi("المصعد", "Elevator"),
  restroom: bi("دورة المياه المخصصة", "Accessible restroom"),
};

export const ZONE_HINT: Record<ZoneKey, L> = {
  approach: bi(
    "صوّر المسار من نقطة الوصول حتى المدخل بوضوح.",
    "Capture the route from the arrival point to the entrance clearly.",
  ),
  entrance: bi(
    "صوّر المدخل والطريق المؤدي إليه بوضوح، ويمكن إضافة أكثر من زاوية عند الحاجة.",
    "Capture the entrance and path clearly; add another angle when useful.",
  ),
  parking: bi(
    "حاول إظهار الموقف المخصص وعلاقته بمسار الوصول.",
    "Try to show the accessible parking space and its relationship to the access route.",
  ),
  elevator: bi(
    "صوّر مدخل المصعد والمنطقة المحيطة به. أضف صورة أخرى إذا احتجت لإظهار جانب مختلف.",
    "Capture the elevator entrance and surrounding area. Add another photo if another view is needed.",
  ),
  restroom: bi(
    "صوّر المدخل والعناصر المهمة بوضوح دون تصوير الأشخاص. يمكن إضافة أكثر من صورة عند الحاجة.",
    "Capture the entrance and relevant visible features without photographing people. Add more than one photo when useful.",
  ),
};

export const ZONE_INDICATORS: Record<ZoneKey, IndicatorKey[]> = {
  approach: ["path_surface", "curb_ramp"],
  entrance: ["steps", "ramp", "handrail", "obstruction"],
  parking: ["parking", "parking_route"],
  elevator: ["elevator"],
  restroom: ["accessible_restroom"],
};

/* Indicators --------------------------------------------------------------- */

export const INDICATOR_ORDER: IndicatorKey[] = ZONE_ORDER.flatMap((z) => ZONE_INDICATORS[z]);

export const INDICATOR_ZONE: Record<IndicatorKey, ZoneKey> = {
  path_surface: "approach",
  curb_ramp: "approach",
  steps: "entrance",
  ramp: "entrance",
  handrail: "entrance",
  obstruction: "entrance",
  parking: "parking",
  parking_route: "parking",
  elevator: "elevator",
  elevator_space: "elevator",
  accessible_restroom: "restroom",
  restroom_door: "restroom",
};

export const INDICATOR_LABEL: Record<IndicatorKey, L> = {
  path_surface: bi("مسار الوصول الظاهر", "Visible approach route"),
  curb_ramp: bi("منحدر رصيف", "Curb ramp"),
  steps: bi("درجات أو عتبة مرتفعة", "Steps or a raised threshold"),
  ramp: bi("منحدر", "Ramp"),
  handrail: bi("درابزين", "Handrail"),
  obstruction: bi("عائق في مسار الوصول", "Obstruction on the route"),
  parking: bi("موقف مخصص أو علامة إتاحة", "Accessible parking or access marking"),
  parking_route: bi("مسار من الموقف إلى المدخل", "Route from parking to the entrance"),
  elevator: bi("مصعد", "Elevator"),
  elevator_space: bi("تفاصيل إضافية للمصعد", "Additional elevator evidence"),
  accessible_restroom: bi("دورة مياه مخصصة", "Accessible restroom"),
  restroom_door: bi("تفاصيل إضافية لدورة المياه", "Additional restroom evidence"),
};

const FEMININE: IndicatorKey[] = ["steps", "accessible_restroom"];

export function stateLabel(key: IndicatorKey, state: IndicatorState): L {
  const f = FEMININE.includes(key);
  switch (state) {
    case "present":
      return bi(f ? "موثقة في الصور" : "موثق في الصور", "Documented in images");
    case "absent":
      return bi(
        f ? "غير ظاهرة في الأدلة المراجعة" : "غير ظاهر في الأدلة المراجعة",
        "Not shown in reviewed evidence",
      );
    case "not_visible":
      return bi("خارج إطار الصور الحالية", "Outside the current image frames");
    case "not_documented":
      return bi("غير موثق بعد", "Not documented yet");
    case "conflicting":
      return bi("معلومات متعارضة", "Conflicting information");
    case "not_applicable":
      return bi("لا ينطبق", "Not applicable");
    default:
      return bi("لا يمكن التأكد", "Cannot be confirmed");
  }
}

/* Access needs ------------------------------------------------------------- */

export const ACCESS_NEEDS: AccessNeed[] = [
  "step_free",
  "ramp_when_raised",
  "clear_path",
  "handrail",
  "parking",
  "elevator",
  "accessible_restroom",
];

export const ACCESS_NEED_LABEL: Record<AccessNeed, L> = {
  step_free: bi("مسار بلا درجات", "Step-free route"),
  ramp_when_raised: bi("منحدر", "Ramp"),
  clear_path: bi("مسار خالٍ من العوائق", "Obstacle-free path"),
  handrail: bi("درابزين", "Handrail"),
  parking: bi("موقف مخصص", "Accessible parking"),
  elevator: bi("مصعد", "Elevator"),
  accessible_restroom: bi("دورة مياه مخصصة", "Accessible restroom"),
};

/* Verification ------------------------------------------------------------- */

export const VERIFICATION_LABEL: Record<VerificationStatus, L> = {
  team_reviewed: bi("راجعه فريق مُتاح", "Reviewed by the MUTAH team"),
  contributor_only: bi("مصدره مساهم، لم يُراجع بعد", "From a contributor, not yet reviewed"),
  pending_review: bi("قيد المراجعة", "Under review"),
  disputed: bi("معلومات متعارضة", "Conflicting information"),
  stale: bi("تحتاج تحديثًا", "Needs an update"),
};

/* Dates -------------------------------------------------------------------- */

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return lang === "ar" ? "التاريخ غير متاح" : "Date unavailable";
  const months = lang === "ar" ? AR_MONTHS : EN_MONTHS;
  return lang === "ar"
    ? `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
    : `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function relativeDate(iso: string, lang: Lang, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || Number.isNaN(now.getTime())) {
    return lang === "ar" ? "وقت التحديث غير متاح" : "Update time unavailable";
  }
  const days = Math.max(0, Math.round((now.getTime() - date.getTime()) / 86400000));
  if (lang === "ar") {
    if (days === 0) return "اليوم";
    if (days === 1) return "أمس";
    if (days < 11) return `قبل ${days} أيام`;
    if (days < 60) return `قبل ${Math.round(days / 7)} أسابيع`;
    return `قبل ${Math.round(days / 30)} أشهر`;
  }
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 11) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}
