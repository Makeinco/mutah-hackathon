export type MutahLocale = "ar" | "en";

export type BilingualContent<T> = Readonly<Record<MutahLocale, Readonly<T>>>;

export type EvidenceStateKey = "present" | "absent" | "unknown" | "notVisible" | "notDocumented";

export type SharedCopy = {
  knowBeforeYouGo: string;
  explore: string;
  contribute: string;
  humanVerification: string;
  accessNeeds: string;
  trustedInformation: string;
  insufficientInformation: string;
  retry: string;
  loading: string;
  evidenceStates: Readonly<Record<EvidenceStateKey, string>>;
};

export const SHARED_COPY: BilingualContent<SharedCopy> = {
  ar: {
    knowBeforeYouGo: "اعرف قبل أن تصل",
    explore: "استكشف",
    contribute: "ساهم",
    humanVerification: "تحقق بشريًا",
    accessNeeds: "احتياجات الوصول",
    trustedInformation: "معلومات موثوقة",
    insufficientInformation: "معلومات غير كافية",
    retry: "إعادة المحاولة",
    loading: "جارٍ التحميل…",
    evidenceStates: {
      present: "موجود",
      absent: "غير موجود",
      unknown: "غير معروف",
      notVisible: "غير ظاهر",
      notDocumented: "غير موثق",
    },
  },
  en: {
    knowBeforeYouGo: "Know before you go",
    explore: "Explore",
    contribute: "Contribute",
    humanVerification: "Human verification",
    accessNeeds: "Access needs",
    trustedInformation: "Trusted information",
    insufficientInformation: "Insufficient information",
    retry: "Try again",
    loading: "Loading…",
    evidenceStates: {
      present: "Present",
      absent: "Absent",
      unknown: "Unknown",
      notVisible: "Not Visible",
      notDocumented: "Not Documented",
    },
  },
};
