import cafeImg from "@/assets/entrance-cafe.jpg";
import libraryImg from "@/assets/entrance-library.jpg";
import pharmacyImg from "@/assets/entrance-pharmacy.jpg";
import mallImg from "@/assets/entrance-mall.jpg";
import { bi } from "./i18n";
import { INDICATOR_ZONE, ZONE_ORDER } from "./labels";
import type {
  Contribution,
  EvidenceImage,
  Facility,
  IndicatorEvidence,
  IndicatorKey,
  ZoneEvidence,
  ZoneKey,
} from "./types";

/**
 * Demo repository. These records demonstrate product behaviour only.
 * No demo image is allowed to support an indoor claim it does not visibly show.
 */

const ALL_INDICATORS: IndicatorKey[] = [
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

const ev = (
  key: IndicatorKey,
  state: IndicatorEvidence["state"],
  ar: string,
  en: string,
): IndicatorEvidence => ({ key, state, note: bi(ar, en) });

const UNDOCUMENTED = bi(
  "لا توجد أدلة مرئية موثقة لهذا العنصر بعد.",
  "There is no documented visual evidence for this feature yet.",
);

function indicators(list: IndicatorEvidence[]): Facility["indicators"] {
  const map = Object.fromEntries(list.map((e) => [e.key, e])) as Partial<Facility["indicators"]>;
  for (const key of ALL_INDICATORS) {
    if (!map[key]) map[key] = { key, state: "not_documented", note: UNDOCUMENTED };
  }
  return map as Facility["indicators"];
}

function zones(documented: Partial<Record<ZoneKey, EvidenceImage[]>>): Facility["zones"] {
  return Object.fromEntries(
    ZONE_ORDER.map((key) => {
      const images = documented[key] ?? [];
      return [key, { key, images, documented: images.length > 0 } satisfies ZoneEvidence];
    }),
  ) as Facility["zones"];
}

const img = (url: string, ar: string, en: string, capturedISO: string): EvidenceImage => ({
  url,
  alt: bi(ar, en),
  capturedISO,
});

export const FACILITIES: Facility[] = [
  {
    id: "cafe-nassim",
    name: bi("مقهى نسيم", "Naseem Café"),
    category: bi("مقهى", "Café"),
    area: bi("حي النخيل", "Al Nakheel district"),
    distanceKm: 0.4,
    point: { x: 0.32, y: 0.38 },
    imageUrl: cafeImg,
    imageAlt: bi(
      "مدخل مقهى نسيم: باب زجاجي تسبقه درجة واحدة ورصيف مرصوف.",
      "Naseem Café entrance: a glass door with one step and a paved sidewalk.",
    ),
    lastVerifiedISO: "2026-08-24",
    verification: "team_reviewed",
    source: "contributor_image",
    indicators: indicators([
      ev(
        "path_surface",
        "present",
        "يظهر رصيف مرصوف أمام المقهى.",
        "A paved sidewalk is visible in front of the café.",
      ),
      ev(
        "curb_ramp",
        "not_visible",
        "طرف الرصيف خارج إطار الصورة.",
        "The curb edge is outside the photo frame.",
      ),
      ev(
        "steps",
        "present",
        "تظهر درجة أمام الباب الرئيسي.",
        "One step is visible in front of the main door.",
      ),
      ev(
        "ramp",
        "not_visible",
        "لا يظهر كامل محيط المدخل في الصورة الحالية.",
        "The full entrance surroundings are not visible in the current image.",
      ),
      ev(
        "handrail",
        "unknown",
        "لا تكفي الصورة لتأكيد وجود درابزين مناسب.",
        "The image is not sufficient to confirm a handrail.",
      ),
      ev(
        "obstruction",
        "absent",
        "لا يظهر عائق واضح في الجزء المصور من المسار.",
        "No clear obstruction is shown in the photographed part of the route.",
      ),
    ]),
    zones: zones({
      approach: [
        img(
          cafeImg,
          "الرصيف المؤدي إلى مقهى نسيم.",
          "The sidewalk leading to Naseem Café.",
          "2026-08-24",
        ),
      ],
      entrance: [
        img(
          cafeImg,
          "الباب الزجاجي وأمامه درجة واحدة.",
          "The glass door with a single step in front.",
          "2026-08-24",
        ),
      ],
    }),
  },
  {
    id: "library-taak",
    name: bi("مكتبة الحي العامة", "Neighbourhood Public Library"),
    category: bi("مكتبة عامة", "Public library"),
    area: bi("حي الياسمين", "Al Yasmin district"),
    distanceKm: 1.2,
    point: { x: 0.62, y: 0.24 },
    imageUrl: libraryImg,
    imageAlt: bi(
      "مدخل مكتبة عامة: أبواب زجاجية وأرضية تبدو مستوية في الجزء المصور.",
      "Public library entrance: glass doors and a floor that appears level in the photographed area.",
    ),
    lastVerifiedISO: "2026-08-20",
    verification: "team_reviewed",
    source: "team_survey",
    indicators: indicators([
      ev(
        "path_surface",
        "present",
        "يظهر مسار مرصوف في الجزء المصور.",
        "A paved route is visible in the photographed area.",
      ),
      ev(
        "steps",
        "absent",
        "لا تظهر درجات في الجزء الموثق حتى الباب.",
        "No steps are shown in the documented section up to the door.",
      ),
      ev(
        "ramp",
        "not_applicable",
        "لا يظهر ارتفاع عند المدخل الموثق يستدعي منحدرًا.",
        "No rise requiring a ramp is shown at the documented entrance.",
      ),
      ev(
        "obstruction",
        "absent",
        "لا يظهر عائق واضح أمام الباب في الصورة المراجعة.",
        "No clear obstruction is shown in front of the door in the reviewed image.",
      ),
      ev(
        "parking",
        "not_visible",
        "منطقة المواقف خارج إطار الصورة الحالية.",
        "The parking area is outside the current image frame.",
      ),
    ]),
    zones: zones({
      approach: [
        img(
          libraryImg,
          "المسار الظاهر أمام المكتبة.",
          "The visible route in front of the library.",
          "2026-08-20",
        ),
      ],
      entrance: [
        img(
          libraryImg,
          "أبواب المكتبة والمنطقة الظاهرة أمامها.",
          "The library doors and the visible area in front of them.",
          "2026-08-20",
        ),
      ],
    }),
  },
  {
    id: "pharmacy-rukn",
    name: bi("صيدلية الركن", "Al Rukn Pharmacy"),
    category: bi("صيدلية", "Pharmacy"),
    area: bi("حي النخيل", "Al Nakheel district"),
    distanceKm: 0.8,
    point: { x: 0.44, y: 0.66 },
    imageUrl: pharmacyImg,
    imageAlt: bi(
      "مدخل صيدلية: عتبة مرتفعة أمام الباب وأحواض نباتات على الرصيف.",
      "Pharmacy entrance: a raised threshold at the door and planters on the sidewalk.",
    ),
    lastVerifiedISO: "2026-05-11",
    verification: "stale",
    source: "contributor_image",
    indicators: indicators([
      ev(
        "path_surface",
        "present",
        "يظهر رصيف مرصوف أمام الصيدلية.",
        "A paved sidewalk is shown in front of the pharmacy.",
      ),
      ev(
        "curb_ramp",
        "not_visible",
        "حافة الرصيف ليست موثقة بالكامل.",
        "The curb edge is not fully documented.",
      ),
      ev(
        "steps",
        "present",
        "تظهر عتبة مرتفعة أمام الباب.",
        "A raised threshold is visible at the door.",
      ),
      ev(
        "ramp",
        "absent",
        "لا يظهر منحدر في منطقة المدخل الموثقة.",
        "No ramp is shown in the documented entrance area.",
      ),
      ev(
        "handrail",
        "absent",
        "لا يظهر درابزين في منطقة المدخل الموثقة.",
        "No handrail is shown in the documented entrance area.",
      ),
      ev(
        "obstruction",
        "present",
        "تظهر أحواض نباتات تضيق الجزء المصور من مسار الوصول.",
        "Planters narrow the photographed part of the access route.",
      ),
      ev(
        "parking",
        "not_visible",
        "منطقة المواقف خارج إطار الصور الحالية.",
        "The parking area is outside the current image frames.",
      ),
      ev(
        "elevator",
        "not_applicable",
        "تمت مراجعة هذا المثال التجريبي كمحل بطابق واحد.",
        "This demo example is reviewed as a single-storey shop.",
      ),
    ]),
    zones: zones({
      approach: [
        img(
          pharmacyImg,
          "الجزء المصور من الرصيف أمام الصيدلية.",
          "The photographed part of the sidewalk in front of the pharmacy.",
          "2026-05-11",
        ),
      ],
      entrance: [
        img(
          pharmacyImg,
          "عتبة مرتفعة وأحواض نباتات قرب الباب.",
          "A raised threshold and planters near the door.",
          "2026-05-11",
        ),
      ],
    }),
  },
  {
    id: "mall-side",
    name: bi("مركز الواحة — المدخل الجانبي", "Al Waha Centre — side entrance"),
    category: bi("مركز تسوق", "Shopping centre"),
    area: bi("طريق الملك عبدالله", "King Abdullah Road"),
    distanceKm: 2.6,
    point: { x: 0.74, y: 0.58 },
    imageUrl: mallImg,
    imageAlt: bi(
      "مدخل جانبي لمركز تسوق يظهر فيه منحدر ودرابزين في الجزء المصور.",
      "A shopping-centre side entrance showing a ramp and handrails in the photographed area.",
    ),
    lastVerifiedISO: "2026-08-26",
    verification: "team_reviewed",
    source: "team_survey",
    indicators: indicators([
      ev(
        "path_surface",
        "present",
        "يظهر مسار مرصوف في الجزء الموثق.",
        "A paved route is visible in the documented area.",
      ),
      ev(
        "steps",
        "present",
        "تظهر درجات بجانب المنحدر.",
        "Steps are visible beside the ramp.",
      ),
      ev(
        "ramp",
        "present",
        "يظهر منحدر يصل إلى منطقة الباب.",
        "A ramp is shown leading toward the doorway area.",
      ),
      ev(
        "handrail",
        "present",
        "يظهر درابزين بمحاذاة المنحدر.",
        "A handrail is visible alongside the ramp.",
      ),
      ev(
        "obstruction",
        "absent",
        "لا يظهر عائق واضح على الجزء المصور من المنحدر.",
        "No clear obstruction is shown on the photographed part of the ramp.",
      ),
      ev(
        "parking",
        "present",
        "تظهر علامة موقف مخصص ضمن الدليل التجريبي.",
        "An accessible-parking marking is shown in the demo evidence.",
      ),
      ev(
        "parking_route",
        "unknown",
        "لا تكفي الصورة الحالية لتأكيد كامل المسار من الموقف إلى المدخل.",
        "The current image is not enough to confirm the full route from parking to the entrance.",
      ),
      ev(
        "elevator",
        "not_documented",
        "لا توجد صورة داخلية موثقة للمصعد بعد.",
        "No documented interior elevator image is available yet.",
      ),
      ev(
        "accessible_restroom",
        "not_documented",
        "لا توجد صور موثقة لدورة المياه المخصصة بعد.",
        "No documented accessible-restroom images are available yet.",
      ),
    ]),
    zones: zones({
      approach: [
        img(
          mallImg,
          "المسار الظاهر المؤدي إلى المدخل الجانبي.",
          "The visible route leading to the side entrance.",
          "2026-08-26",
        ),
      ],
      entrance: [
        img(
          mallImg,
          "منحدر ودرابزين عند المدخل الجانبي.",
          "Ramp and handrail at the side entrance.",
          "2026-08-26",
        ),
      ],
      parking: [
        img(
          mallImg,
          "جزء من منطقة الموقف المخصص الظاهرة في الدليل التجريبي.",
          "Part of the accessible-parking area shown in the demo evidence.",
          "2026-08-26",
        ),
      ],
    }),
  },
  {
    id: "clinic-noor",
    name: bi("مركز نور الصحي", "Noor Health Centre"),
    category: bi("مركز صحي", "Health centre"),
    area: bi("حي الياسمين", "Al Yasmin district"),
    distanceKm: 1.9,
    point: { x: 0.2, y: 0.72 },
    imageUrl: "",
    imageAlt: bi("", ""),
    lastVerifiedISO: "2026-03-02",
    verification: "stale",
    source: "contributor_image",
    indicators: indicators([]),
    zones: zones({}),
  },
];

export const INITIAL_CONTRIBUTIONS: Contribution[] = [
  {
    id: "c-1024",
    facilityId: "pharmacy-rukn",
    facilityName: bi("صيدلية الركن", "Al Rukn Pharmacy"),
    zone: "entrance",
    imageUrl: pharmacyImg,
    imageUrls: [pharmacyImg],
    submittedISO: "2026-08-26",
    status: "pending_review",
    aiObservations: [
      ev(
        "steps",
        "present",
        "تظهر عتبة مرتفعة أمام الباب.",
        "A raised threshold is visible at the door.",
      ),
      ev(
        "ramp",
        "absent",
        "لا يظهر منحدر في منطقة المدخل الموثقة.",
        "No ramp is shown in the documented entrance area.",
      ),
      ev(
        "handrail",
        "absent",
        "لا يظهر درابزين في منطقة المدخل الموثقة.",
        "No handrail is shown in the documented entrance area.",
      ),
      ev(
        "obstruction",
        "present",
        "تظهر أحواض نباتات على الجزء المصور من مسار الوصول.",
        "Planters appear on the photographed part of the access route.",
      ),
    ],
    confirmed: {
      steps: { state: "present", action: "confirmed" },
      ramp: { state: "absent", action: "confirmed" },
      handrail: { state: "absent", action: "confirmed" },
      obstruction: { state: "present", action: "confirmed" },
    },
  },
];

export function listFacilities(): Facility[] {
  return FACILITIES;
}

export function getFacility(id: string): Facility | undefined {
  return FACILITIES.find((f) => f.id === id);
}

export function zoneOf(key: IndicatorKey): ZoneKey {
  return INDICATOR_ZONE[key];
}
