import { bi } from "./i18n";
import { INDICATOR_ORDER } from "./labels";
import type { AccessNeed, Facility, IndicatorKey, IndicatorState, L } from "./types";

export type NeedOutcome = "met" | "not_met" | "unknown";

export interface NeedResult {
  need: AccessNeed;
  outcome: NeedOutcome;
  reason: L;
}

export type Verdict = "available" | "partial" | "not_available" | "insufficient";

export const VERDICT_LABEL: Record<Verdict, L> = {
  available: bi("متاح", "Accessible"),
  partial: bi("متاح جزئيًا", "Partially accessible"),
  not_available: bi("غير متاح وفق احتياجاتك الحالية", "Not accessible for your current needs"),
  insufficient: bi("معلومات غير كافية", "Insufficient information"),
};

export const VERDICT_DETAIL: Record<Verdict, L> = {
  available: bi(
    "الأدلة الموثقة تدعم احتياجات الوصول التي اخترتها.",
    "Verified evidence supports the access needs you selected.",
  ),
  partial: bi(
    "بعض احتياجاتك مدعومة، مع وجود معلومات ناقصة أو عائق يحتاج الانتباه.",
    "Some of your needs are supported, while other evidence is missing or requires attention.",
  ),
  not_available: bi(
    "يوجد عائق موثق يتعارض مع إحدى احتياجات الوصول الأساسية التي اخترتها.",
    "Verified evidence shows a barrier that conflicts with one of your selected essential access needs.",
  ),
  insufficient: bi(
    "لا توجد أدلة موثقة كافية لاتخاذ قرار واضح بعد.",
    "There is not enough verified evidence yet to make a clear decision.",
  ),
};

const known = (s: IndicatorState) => s === "present" || s === "absent" || s === "not_applicable";

function state(f: Facility, k: IndicatorKey): IndicatorState {
  return f.indicators[k]?.state ?? "unknown";
}

function evaluate(f: Facility, need: AccessNeed): NeedResult {
  const steps = state(f, "steps");
  const ramp = state(f, "ramp");

  switch (need) {
    case "step_free": {
      const curb = state(f, "curb_ramp");
      if (steps === "absent")
        return { need, outcome: "met", reason: bi("لا تظهر درجات أو عتبة عند المدخل.", "No steps or raised threshold are shown at the entrance.") };
      if (steps === "present" && ramp === "present")
        return {
          need,
          outcome: "met",
          reason: bi(
            curb === "present"
              ? "توجد درجة، لكن يظهر منحدر عند المدخل ومنحدر رصيف على المسار."
              : "توجد درجة، لكن يظهر منحدر بديل بجانب المدخل.",
            curb === "present"
              ? "There is a step, but an entrance ramp and curb ramp are documented."
              : "There is a step, but an alternative ramp is documented beside the entrance.",
          ),
        };
      if (steps === "present" && ramp === "absent")
        return { need, outcome: "not_met", reason: bi("تظهر درجة عند المدخل ولا يظهر منحدر بديل في الأدلة الحالية.", "A step is documented and no alternative ramp appears in the current evidence.") };
      return { need, outcome: "unknown", reason: bi("لا تكفي الصور الحالية لتأكيد مسار بلا درجات.", "Current images do not provide enough evidence to confirm a step-free route.") };
    }
    case "ramp_when_raised": {
      if (steps === "absent") return { need, outcome: "met", reason: bi("لا تظهر عتبة أو درجة تستدعي منحدرًا في الأدلة الحالية.", "No raised threshold requiring a ramp is shown in the current evidence.") };
      if (ramp === "present") return { need, outcome: "met", reason: bi("يظهر منحدر عند المدخل.", "A ramp is documented at the entrance.") };
      if (ramp === "absent" && steps === "present")
        return { need, outcome: "not_met", reason: bi("يوجد ارتفاع موثق ولا يظهر منحدر بديل.", "A rise is documented and no alternative ramp is shown.") };
      return { need, outcome: "unknown", reason: bi("لم يتضح وجود منحدر في الصور الحالية.", "A ramp cannot be confirmed from the current images.") };
    }
    case "clear_path": {
      const obstruction = state(f, "obstruction");
      if (obstruction === "present") return { need, outcome: "not_met", reason: bi("يظهر عائق في مسار الوصول إلى الباب.", "An obstruction is documented on the route to the entrance.") };
      if (obstruction === "absent") return { need, outcome: "met", reason: bi("لا يظهر عائق في مسار الوصول ضمن الأدلة الحالية.", "No obstruction is shown on the documented route.") };
      return { need, outcome: "unknown", reason: bi("مسار الوصول غير موثق بما يكفي بعد.", "The approach route is not documented well enough yet.") };
    }
    case "handrail": {
      const h = state(f, "handrail");
      if (h === "present") return { need, outcome: "met", reason: bi("يظهر درابزين عند المدخل.", "A handrail is documented at the entrance.") };
      if (h === "absent") return { need, outcome: "not_met", reason: bi("لا يظهر درابزين في الأدلة الحالية.", "No handrail appears in the current evidence.") };
      return { need, outcome: "unknown", reason: bi("لا يمكن تأكيد وجود درابزين من الصور الحالية.", "A handrail cannot be confirmed from the current images.") };
    }
    case "parking": {
      const p = state(f, "parking");
      if (p === "present") return { need, outcome: "met", reason: bi("يظهر موقف مخصص أو علامة إتاحة.", "Accessible parking or an access marking is documented.") };
      if (p === "absent") return { need, outcome: "not_met", reason: bi("لا يظهر موقف مخصص أو علامة إتاحة في الأدلة الحالية.", "No accessible parking or access marking appears in the current evidence.") };
      return { need, outcome: "unknown", reason: bi("منطقة المواقف غير موثقة بما يكفي بعد.", "The parking area is not documented well enough yet.") };
    }
    case "elevator": {
      const e = state(f, "elevator");
      if (e === "present") return { need, outcome: "met", reason: bi("يوجد دليل بصري موثق على المصعد.", "Verified visual evidence documents an elevator.") };
      if (e === "absent") return { need, outcome: "not_met", reason: bi("لا يظهر مصعد في الأدلة المراجعة المتاحة حاليًا.", "No elevator appears in the currently reviewed evidence.") };
      if (e === "not_applicable") return { need, outcome: "met", reason: bi("تمت مراجعة هذه الحاجة باعتبارها غير منطبقة على هذا المرفق.", "This need has been reviewed as not applicable for this facility.") };
      return { need, outcome: "unknown", reason: bi("لا توجد أدلة موثقة كافية عن المصعد بعد.", "There is not enough verified elevator evidence yet.") };
    }
    case "accessible_restroom": {
      const r = state(f, "accessible_restroom");
      if (r === "present") return { need, outcome: "met", reason: bi("توجد دورة مياه مخصصة موثقة بالصور.", "A documented accessible restroom is shown in the evidence.") };
      if (r === "absent") return { need, outcome: "not_met", reason: bi("لا تظهر دورة مياه مخصصة في الأدلة المراجعة المتاحة حاليًا.", "No accessible restroom appears in the currently reviewed evidence.") };
      return { need, outcome: "unknown", reason: bi("لا توجد أدلة موثقة كافية عن دورة المياه المخصصة بعد.", "There is not enough verified accessible-restroom evidence yet.") };
    }
  }
}

export interface Decision {
  verdict: Verdict;
  results: NeedResult[];
  completeness: number;
  total: number;
}

export function decideFor(facility: Facility, needs: AccessNeed[]): Decision {
  const results = needs.map((n) => evaluate(facility, n));
  const completeness = INDICATOR_ORDER.filter((k) => known(state(facility, k))).length;
  const total = INDICATOR_ORDER.length;

  let verdict: Verdict;
  if (results.length === 0) {
    verdict = "insufficient";
  } else if (results.some((r) => r.outcome === "not_met")) {
    verdict = "not_available";
  } else if (results.every((r) => r.outcome === "met")) {
    verdict = "available";
  } else if (results.some((r) => r.outcome === "met")) {
    verdict = "partial";
  } else {
    verdict = "insufficient";
  }

  return { verdict, results, completeness, total };
}
