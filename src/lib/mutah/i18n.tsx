import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { L, Lang } from "./types";

/**
 * Bilingual layer. Arabic is the primary language; English is a full peer,
 * not a partial translation. Direction follows the language.
 */

const STORAGE_KEY = "mutah.lang";

interface LangState {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** Resolve a bilingual value. */
  pick: (value: L) => string;
  /** Resolve a UI string from the dictionary. */
  t: (key: keyof typeof UI) => string;
}

const LangContext = createContext<LangState | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ar") setLangState(stored);
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable — language still applies for this session */
    }
  }, []);

  const value = useMemo<LangState>(() => {
    const pick = (v: L) => (lang === "ar" ? v.ar : v.en);
    return {
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      toggle: () => setLang(lang === "ar" ? "en" : "ar"),
      pick,
      t: (key) => pick(UI[key]),
    };
  }, [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangState {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}

const l = (ar: string, en: string): L => ({ ar, en });

/** UI dictionary. Content strings live with the data; chrome lives here. */
export const UI = {
  brand: l("مُتاح ماب", "MUTAH MAP"),
  tagline: l("اعرف قبل أن تصل", "Know before you go"),
  taglineSub: l(
    "معلومات واضحة عن المكان تساعدك قبل الزيارة.",
    "Clear, evidence-based access information before you visit.",
  ),

  navHome: l("الرئيسية", "Home"),
  navAccount: l("حسابي", "Account"),
  navMutah: l("مُتاح", "MUTAH"),
  navDiscover: l("استكشف", "Explore"),
  navContribute: l("ساهم", "Contribute"),
  navEcosystem: l("مُتاح", "MUTAH"),
  navAbout: l("عن مُتاح", "About"),
  navReview: l("مركز المراجعة", "Review centre"),
  navInsights: l("مُتاح إنسايتس", "MUTAH Insights"),
  mainNav: l("التنقل الرئيسي", "Main navigation"),
  bottomNav: l("التنقل السفلي", "Bottom navigation"),
  home: l("الصفحة الرئيسية", "Home"),
  skipToContent: l("تخطَّ إلى المحتوى", "Skip to content"),

  language: l("اللغة", "Language"),
  switchToEnglish: l("English", "English"),
  switchToArabic: l("العربية", "العربية"),

  search: l("ابحث عن مكان...", "Search for a place..."),
  searchLabel: l("ابحث عن مكان", "Search for a place"),
  explore: l("استكشف الأماكن", "Explore places"),
  setNeeds: l("حدد احتياجات الوصول", "Set your access needs"),
  recentlyUpdated: l("أماكن تم تحديث معلوماتها مؤخرًا", "Recently updated places"),

  needsTitle: l("ما الذي تحتاجه لتكون الزيارة أسهل؟", "What makes a visit easier for you?"),
  needsIntro: l(
    "هذه احتياجات وصول، ولا نطلب أي معلومة طبية. يمكنك تغييرها في أي وقت.",
    "These are access needs, not medical information. You can change them any time.",
  ),
  needsLegend: l("اختر احتياجات الوصول", "Select your access needs"),
  continueLabel: l("متابعة", "Continue"),
  skipForNow: l("تخطي الآن", "Skip for now"),
  editNeeds: l("تعديل الاحتياجات", "Edit needs"),
  accessNeeds: l("احتياجات الوصول", "Access needs"),

  results: l("نتيجة", "results"),
  viewMode: l("طريقة العرض", "View mode"),
  mapView: l("الخريطة", "Map"),
  listView: l("القائمة", "List"),
  noResults: l("لا توجد نتائج مطابقة", "No matching results"),
  noResultsBody: l(
    "جرّب اسمًا آخر أو أزل بعض عوامل التصفية. يمكنك أيضًا المساهمة بصورة لمكان لم يُوثّق بعد.",
    "Try another name or clear some filters. You can also contribute a photo of a place that isn't documented yet.",
  ),
  goContribute: l("اذهب إلى المساهمة", "Go to contribute"),
  viewDetails: l("عرض التفاصيل", "View details"),
  about: l("عن", "about"),

  whyThisResult: l("لماذا هذه النتيجة؟", "Why this result?"),
  basedOnNeeds: l(
    "بناءً على احتياجات الوصول التي اخترتها والأدلة المرئية المتاحة.",
    "Based on the access needs you selected and the visual evidence available.",
  ),
  noNeedsYet: l(
    "لم تحدد احتياجات وصول بعد، لذلك نعرض ما هو معروف وما هو غير معروف عن المكان.",
    "You haven't set access needs yet, so we show what is known and what is not.",
  ),
  completeness: l("اكتمال المعلومات", "Information completeness"),
  infoComplete: l("معلومات مكتملة", "Information is complete"),
  infoMissing: l("توجد معلومات ناقصة", "Some information is missing"),
  infoLimited: l("معلومات محدودة", "Limited information"),
  infoStale: l("تحتاج تحديثًا", "Needs an update"),
  personalStatus: l("مستوى الإتاحة وفق احتياجاتك", "Access level for your needs"),
  evidenceHere: l("أدلة الوصول في هذا المرفق", "Access evidence at this place"),
  insideFacility: l("داخل المرفق — عند توفر دليل", "Inside the facility — where evidence exists"),
  whatToDocument: l("ماذا تريد توثيقه؟", "What would you like to document?"),
  addAnotherPhoto: l("إضافة صورة أخرى", "Add another photo"),
  removePhoto: l("إزالة الصورة", "Remove photo"),
  photoCount: l("صور مختارة", "photos selected"),
  accountTitle: l("حسابي", "Account"),
  accountIntro: l("إعدادات خفيفة: اللغة، احتياجات الوصول، مساهماتك، والخصوصية.", "Lightweight settings: language, access needs, your contributions, and privacy."),
  myContributions: l("مساهماتي", "My contributions"),
  demoData: l("بيانات تجريبية للعرض", "Demo data for this preview"),
  privacyTitle: l("الخصوصية", "Privacy"),
  privacyBody: l("لا نطلب معلومات طبية. تجنّب تصوير الوجوه ولوحات المركبات، وتُزال بيانات الموقع من الصور عند الإمكان.", "We never ask for medical information. Avoid faces and vehicle plates; location data is removed from photos where possible."),
  settingsTitle: l("إعدادات عامة", "General settings"),
  noContributionsYet: l("لا توجد مساهمات بعد.", "No contributions yet."),
  confirmedOf: l("عنصرًا مؤكدًا من", "confirmed of"),

  evidenceViews: l("الأدلة حسب المسار", "Evidence by view"),
  evidenceViewsHint: l(
    "كل مسار يُعرض بأدلته الخاصة. ما لا يظهر في الصور يبقى معروضًا كغير مؤكد.",
    "Each view carries its own evidence. Anything not visible stays marked as unconfirmed.",
  ),
  noEvidenceForZone: l(
    "لا توجد أدلة موثقة لهذا المسار بعد.",
    "This view has not been documented yet.",
  ),
  contributeThisView: l("ساهم بصورة لهذا المسار", "Contribute a photo of this view"),
  noPhoto: l("لا توجد صورة", "No photo"),
  noRecentPhoto: l(
    "لا توجد صورة حديثة لهذا المكان. المساهمة بصورة تجعل المعلومات أوضح للجميع.",
    "No recent photo for this place. Contributing one makes the information clearer for everyone.",
  ),

  infoStatus: l("حالة المعلومة", "Information status"),
  lastVerified: l("آخر تحقق", "Last verified"),
  source: l("المصدر", "Source"),
  sourceTeam: l("مسح ميداني من فريق مُتاح", "MUTAH team field survey"),
  sourceContributor: l("صورة مساهم", "Contributor photo"),
  contributeNewer: l("ساهم بصورة أحدث", "Contribute a newer photo"),
  reportChange: l("أبلغ عن تغير", "Report a change"),
  pendingHere: l("مساهمة قيد المراجعة لهذا المكان. لن تُنشر قبل مراجعتها.", "contribution(s) under review for this place. Nothing is published before review."),

  analysisTrail: l("دليل التحليل", "Analysis trail"),
  analysisTrailHint: l(
    "تحليل أولي يحتاج إلى تحقق. الذكاء الاصطناعي يرصد، والبشر يتحققون.",
    "A preliminary reading that needs verification. AI observes, humans verify.",
  ),
  notCertification: l(
    "لا يُعد هذا التحليل شهادة إتاحة، ولا يصف ما هو خارج إطار الصورة.",
    "This is not an accessibility certification, and it never describes what is outside the frame.",
  ),

  contributeTitle: l("ساهم", "Contribute"),
  contributeIntro: l(
    "ساعد في جعل معلومات الوصول أكثر وضوحًا وحداثة.",
    "Help keep access information clear and current.",
  ),
  chooseFacility: l("ابحث عن المرفق", "Search for a facility"),
  chooseView: l("اختر المسار الذي ستصوّره", "Choose the view you are photographing"),
  startContribution: l("ابدأ المساهمة", "Start contributing"),
  stepPhoto: l("الصورة", "Photo"),
  stepAnalysis: l("التحليل", "Analysis"),
  stepConfirm: l("التأكيد", "Confirm"),
  stepSend: l("الإرسال", "Submit"),
  captureTitle: l("صوّر المسار بوضوح", "Photograph the view clearly"),
  captureHint: l(
    "الصورة الحديثة هي أساس كل دليل في مُتاح.",
    "A recent photo is the basis of every piece of evidence in MUTAH.",
  ),
  takePhoto: l("التقاط صورة", "Take a photo"),
  pickPhoto: l("اختيار من الجهاز", "Choose from device"),
  useSample: l("استخدام صورة تجريبية", "Use a sample photo"),
  retake: l("إعادة الاختيار", "Choose again"),
  continueToAnalysis: l("متابعة للتحليل", "Continue to analysis"),
  previewAlt: l("معاينة الصورة التي اخترتها", "Preview of the photo you selected"),
  analysingTitle: l("جاري تحليل الصورة", "Analysing the photo"),
  analysingHint: l(
    "الذكاء الاصطناعي يرصد ما يظهر في الصورة فقط، ولا يمنح شهادة إتاحة.",
    "The AI only reports what appears in the photo. It never issues a certification.",
  ),
  preliminary: l("تحليل أولي", "Preliminary analysis"),
  preliminaryHint: l(
    "راجع ما ظهر في الصورة قبل إرسال المساهمة.",
    "Review what was observed before submitting.",
  ),
  iConfirm: l("أؤكد", "Confirm"),
  iCorrect: l("تصحيح", "Correct"),
  iAmUnsure: l("لا أستطيع التأكد", "I'm not sure"),
  whatDoYouSee: l("ما الذي تراه فعلًا في", "What do you actually see for"),
  submitForReview: l("إرسال للمراجعة", "Submit for review"),
  reviewedBeforePublish: l("ستتم مراجعة المساهمة قبل نشرها.", "Every contribution is reviewed before it is published."),
  thanks: l("شكرًا لمساهمتك", "Thank you for contributing"),
  thanksBody: l("أُرسلت المعلومات إلى المراجعة.", "Your submission has been sent for review."),
  backToFacility: l("العودة إلى المكان", "Back to the place"),
  openReview: l("فتح مركز المراجعة", "Open the review centre"),

  loading: l("جاري التحميل", "Loading"),
  done: l("مكتمل", "Done"),
  inProgress: l("جارٍ", "In progress"),
  waiting: l("بالانتظار", "Waiting"),
  notFound: l("لم نجد هذا المكان", "We couldn't find this place"),
  notFoundBody: l("ربما تغيّر الرابط. عد إلى الاستكشاف للبحث من جديد.", "The link may have changed. Go back to discover and search again."),
  backToDiscover: l("العودة إلى الاستكشاف", "Back to discover"),
} as const;

export { l as bi };
