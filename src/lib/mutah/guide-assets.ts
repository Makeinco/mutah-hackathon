import type { L, ZoneKey } from "./types";

export type FocusIndicator = "general" | "ramp" | "handrail" | "path_obstruction";

export type GuideAsset = {
  assetKey: string;
  image: string;
  title: L;
  helper: L;
  bullets: L[];
  alt: L;
};

export const FOCUS_LABEL: Record<FocusIndicator, L> = {
  general: { ar: "بشكل عام", en: "General" },
  ramp: { ar: "منحدر", en: "Ramp" },
  handrail: { ar: "درابزين", en: "Handrail" },
  path_obstruction: { ar: "عائق في المسار", en: "Path obstruction" },
};

export const ZONE_FOCUS_OPTIONS: Record<ZoneKey, FocusIndicator[]> = {
  approach: ["general", "ramp", "handrail", "path_obstruction"],
  entrance: ["general", "ramp", "handrail"],
  parking: ["general"],
  elevator: ["general"],
  restroom: ["general"],
};

export const GENERAL_FOCUS_LABEL: Record<Extract<ZoneKey, "approach" | "entrance">, L> = {
  approach: { ar: "المسار بشكل عام", en: "Approach path in general" },
  entrance: { ar: "المدخل بشكل عام", en: "Entrance in general" },
};

export const ZONE_GUIDE_ASSETS: Record<ZoneKey, GuideAsset> = {
  approach: {
    assetKey: "approach-path",
    image: "/guides/approach-path-transparent.png",
    title: { ar: "مثال لمسار الوصول المناسب", en: "Example of a useful approach-path photo" },
    helper: {
      ar: "صوّر المسار من نقطة الوصول حتى المدخل، مع إبقاء العناصر المحيطة ظاهرة.",
      en: "Photograph the route from the arrival point to the entrance, keeping the surrounding features visible.",
    },
    bullets: [
      {
        ar: "أظهر الطريق من نقطة الوصول حتى المدخل.",
        en: "Show the route from the arrival point to the entrance.",
      },
      {
        ar: "أظهر الرصيف والمنحدر والعوائق إن وجدت.",
        en: "Include the curb, curb ramp, and visible obstacles.",
      },
      { ar: "استخدم زاوية واسعة قدر الإمكان.", en: "Use a wide angle whenever possible." },
    ],
    alt: { ar: "مثال إرشادي لتصوير مسار الوصول", en: "Photo guide example for an approach path" },
  },
  entrance: {
    assetKey: "entrance",
    image: "/guides/entrance-transparent.png",
    title: { ar: "مثال لصورة المدخل المناسبة", en: "Example of a useful entrance photo" },
    helper: {
      ar: "صوّر المدخل والمساحة المؤدية إليه بحيث يظهر اتصال المسار بالباب.",
      en: "Photograph the entrance and the space leading to it so the route to the door is clear.",
    },
    bullets: [
      {
        ar: "أظهر الباب والمساحة أمامه بوضوح.",
        en: "Show the door and the space immediately in front of it.",
      },
      { ar: "أظهر الدرج أو المنحدر إن وجد.", en: "Include visible steps or a ramp." },
      {
        ar: "أضف زاوية ثانية إذا لم يظهر المسار كاملًا.",
        en: "Add a second angle if the full route is not visible.",
      },
    ],
    alt: { ar: "مثال إرشادي لتصوير المدخل", en: "Photo guide example for an entrance" },
  },
  parking: {
    assetKey: "parking",
    image: "/guides/parking-transparent.png",
    title: { ar: "مثال لصورة المواقف المناسبة", en: "Example of a useful parking photo" },
    helper: {
      ar: "صوّر الموقف والعلامات المرئية وصلته بمسار الوصول إلى المبنى.",
      en: "Photograph the bay, visible markings, and its connection to the route toward the building.",
    },
    bullets: [
      {
        ar: "أظهر الموقف المخصص أو علامة الإتاحة إن وجدت.",
        en: "Show the accessible bay or access marking if present.",
      },
      {
        ar: "حاول إظهار علاقته بمسار الوصول للمبنى.",
        en: "Try to show how it connects to the route toward the building.",
      },
      { ar: "تجنب تصوير لوحات المركبات.", en: "Avoid capturing vehicle licence plates." },
    ],
    alt: { ar: "مثال إرشادي لتصوير موقف مخصص", en: "Photo guide example for accessible parking" },
  },
  elevator: {
    assetKey: "elevator",
    image: "/guides/elevator-transparent.png",
    title: { ar: "مثال لصورة المصعد المناسبة", en: "Example of a useful elevator photo" },
    helper: {
      ar: "صوّر باب المصعد والمنطقة أمامه، وأضف زاوية أخرى للأزرار عند الحاجة.",
      en: "Photograph the elevator doors and the area in front, adding another angle for the buttons when useful.",
    },
    bullets: [
      {
        ar: "أظهر باب المصعد والمنطقة المحيطة.",
        en: "Show the elevator doors and surrounding area.",
      },
      {
        ar: "يمكن إضافة صورة للوحة الأزرار إذا كانت واضحة.",
        en: "Add another photo of the call buttons when useful.",
      },
      {
        ar: "لا تستنتج أبعاد المصعد من الصورة.",
        en: "Do not infer elevator dimensions from the photo.",
      },
    ],
    alt: { ar: "مثال إرشادي لتصوير المصعد", en: "Photo guide example for an elevator" },
  },
  restroom: {
    assetKey: "accessible-restroom",
    image: "/guides/accessible-restroom-transparent.png",
    title: {
      ar: "مثال لصورة دورة المياه المخصصة",
      en: "Example of a useful accessible-restroom photo",
    },
    helper: {
      ar: "صوّر المدخل والعلامة الخارجية، ثم العناصر المرئية المهمة دون تصوير أشخاص.",
      en: "Photograph the entrance and external sign, then relevant visible features without photographing people.",
    },
    bullets: [
      {
        ar: "أظهر المدخل والعلامة الخارجية بوضوح.",
        en: "Show the entrance and external access sign clearly.",
      },
      {
        ar: "أضف صورة أخرى للعناصر المرئية المهمة عند الحاجة.",
        en: "Add another image for relevant visible features when needed.",
      },
      {
        ar: "لا تصوّر الأشخاص داخل دورة المياه.",
        en: "Do not photograph people inside the restroom.",
      },
    ],
    alt: {
      ar: "مثال إرشادي لتصوير دورة المياه المخصصة",
      en: "Photo guide example for an accessible restroom",
    },
  },
};

export const INDICATOR_GUIDE_ASSETS: Record<Exclude<FocusIndicator, "general">, GuideAsset> = {
  ramp: {
    assetKey: "ramp",
    image: "/guides/ramp-transparent.png",
    title: { ar: "مثال لصورة منحدر واضحة", en: "Example of a clear ramp photo" },
    helper: {
      ar: "أظهر المنحدر كاملًا وبداية ونهاية المسار إن أمكن.",
      en: "Show the full ramp and the beginning and end of the route when possible.",
    },
    bullets: [
      {
        ar: "صوّر المنحدر كاملًا من زاوية واسعة.",
        en: "Photograph the full ramp from a wide angle.",
      },
      { ar: "أظهر اتصاله بالمسار أو المدخل.", en: "Show how it connects to the path or entrance." },
      {
        ar: "لا تستنتج الميل أو الأبعاد من الصورة.",
        en: "Do not infer slope or dimensions from the image.",
      },
    ],
    alt: { ar: "مثال إرشادي لتصوير منحدر", en: "Photo guide example for a ramp" },
  },
  handrail: {
    assetKey: "handrail",
    image: "/guides/handrail-transparent.png",
    title: { ar: "مثال لصورة درابزين واضحة", en: "Example of a clear handrail photo" },
    helper: {
      ar: "أظهر الدرابزين وعلاقته بالمسار أو المدخل.",
      en: "Show the handrail and its relationship to the path or entrance.",
    },
    bullets: [
      {
        ar: "أظهر امتداد الدرابزين قدر الإمكان.",
        en: "Show the length of the handrail when possible.",
      },
      { ar: "أظهر الدرج أو المنحدر المرتبط به.", en: "Include the related steps or ramp." },
      {
        ar: "أضف زاوية ثانية إذا حجبت العناصر المحيطة.",
        en: "Add a second angle if surrounding features are obscured.",
      },
    ],
    alt: { ar: "مثال إرشادي لتصوير درابزين", en: "Photo guide example for a handrail" },
  },
  path_obstruction: {
    assetKey: "path-obstruction",
    image: "/guides/path-obstruction-transparent.png",
    title: { ar: "مثال لصورة عائق في المسار", en: "Example of a path-obstruction photo" },
    helper: {
      ar: "أظهر العائق والمسار المحيط به بوضوح.",
      en: "Show the obstruction and the surrounding path clearly.",
    },
    bullets: [
      {
        ar: "صوّر العائق ضمن المسار المحيط، لا بمفرده.",
        en: "Photograph the obstruction within its surrounding path, not in isolation.",
      },
      {
        ar: "أظهر الاتجاه قبل العائق وبعده إن أمكن.",
        en: "Show the route before and after the obstruction when possible.",
      },
      {
        ar: "عدم ظهور مسار بديل لا يعني عدم وجوده.",
        en: "A route not being visible does not mean it is absent.",
      },
    ],
    alt: {
      ar: "مثال إرشادي لتصوير عائق في المسار",
      en: "Photo guide example for a path obstruction",
    },
  },
};

export function getGuideAsset(zone: ZoneKey, focus: FocusIndicator): GuideAsset {
  return focus === "general" ? ZONE_GUIDE_ASSETS[zone] : INDICATOR_GUIDE_ASSETS[focus];
}

export function focusLabel(zone: ZoneKey, focus: FocusIndicator): L {
  if (focus === "general" && (zone === "approach" || zone === "entrance")) {
    return GENERAL_FOCUS_LABEL[zone];
  }
  return FOCUS_LABEL[focus];
}
