export type HomeLocale = "ar" | "en";

export type HomeStep = {
  title: string;
  body: string;
};

export type HomeCopy = {
  navigation: {
    home: string;
    mutah: string;
    account: string;
    mainLabel: string;
    bottomLabel: string;
  };
  eyebrow: string;
  heroTitle: string;
  heroBody: string;
  searchPlaceholder: string;
  primaryCta: string;
  secondaryCta: string;
  recentEyebrow: string;
  recentTitle: string;
  recentBody: string;
  viewAll: string;
  lastUpdated: string;
  howEyebrow: string;
  howTitle: string;
  howBody: string;
  steps: HomeStep[];
  aiKicker: string;
  aiTitle: string;
  aiBody: string;
  aiObserves: string;
  humansVerify: string;
  notVisiblePrinciple: string;
  noAutoPublish: string;
  publishAfterReview: string;
  contributeEyebrow: string;
  contributeTitle: string;
  contributeBody: string;
  contributeCta: string;
  heroVisualLabel: string;
  noPhoto: string;
  footerLine: string;
};

export const HOME_COPY: Record<HomeLocale, HomeCopy> = {
  ar: {
    navigation: {
      home: "الرئيسية",
      mutah: "مُتاح",
      account: "حسابي",
      mainLabel: "التنقل الرئيسي",
      bottomLabel: "التنقل السفلي",
    },
    eyebrow: "مُتاح ماب | MUTAH MAP",
    heroTitle: "اعرف قبل أن تصل",
    heroBody: "معلومات وصول واضحة وموثقة تساعدك على اتخاذ قرارك قبل الزيارة.",
    searchPlaceholder: "ابحث عن مكان...",
    primaryCta: "استكشف الأماكن",
    secondaryCta: "حدد احتياجات الوصول",
    recentEyebrow: "معلومات حديثة",
    recentTitle: "أماكن تم تحديث معلوماتها مؤخرًا",
    recentBody: "استكشف أماكن أضيفت أو تمت مراجعة أدلة الوصول فيها مؤخرًا.",
    viewAll: "عرض جميع الأماكن",
    lastUpdated: "آخر تحديث",
    howEyebrow: "ثلاث خطوات واضحة",
    howTitle: "كيف يعمل مُتاح؟",
    howBody: "رحلة بسيطة من البحث إلى الدليل ثم القرار قبل الوصول.",
    steps: [
      { title: "استكشف", body: "ابحث عن الأماكن وتعرّف على معلومات الوصول قبل زيارتك." },
      { title: "ساهم", body: "أضف صورًا ومعلومات من تجربتك لمساعدة الآخرين." },
      { title: "تحقق بشريًا", body: "تُراجع الأدلة قبل النشر لضمان الدقة والموثوقية." },
    ],
    aiKicker: "من الصورة إلى قرار أوضح",
    aiTitle: "الذكاء الاصطناعي يرى. البشر يتحققون.",
    aiBody:
      "يستخرج مُتاح أدلة الوصول المرئية من الصور، ويُبقي عدم اليقين واضحًا، ثم تمر المعلومات بمراجعة بشرية قبل النشر.",
    aiObserves: "يرصد الذكاء الاصطناعي ما يظهر في الدليل فقط.",
    humansVerify: "يتحقق الإنسان من الدليل وسياقه قبل النشر.",
    notVisiblePrinciple: "غير ظاهر لا يعني غير موجود.",
    noAutoPublish: "لا نشر تلقائيًا ولا درجات وصول شاملة.",
    publishAfterReview: "النشر بعد المراجعة",
    contributeEyebrow: "المجتمع جزء من الثقة",
    contributeTitle: "معلومة واحدة قد تفتح الطريق لشخص آخر",
    contributeBody: "صورة حديثة أو تحديث بسيط قد يساعد شخصًا آخر على اتخاذ قرار أوضح قبل الزيارة.",
    contributeCta: "ساهم الآن",
    heroVisualLabel: "من الغموض إلى الوضوح قبل الرحلة",
    noPhoto: "لا توجد صورة",
    footerLine: "اعرف قبل أن تصل.",
  },
  en: {
    navigation: {
      home: "Home",
      mutah: "MUTAH",
      account: "Account",
      mainLabel: "Main navigation",
      bottomLabel: "Bottom navigation",
    },
    eyebrow: "MUTAH MAP | مُتاح ماب",
    heroTitle: "Know before you go",
    heroBody: "Clear, verified access information that helps you decide before you visit.",
    searchPlaceholder: "Search for a place...",
    primaryCta: "Explore places",
    secondaryCta: "Set access needs",
    recentEyebrow: "Fresh information",
    recentTitle: "Recently updated places",
    recentBody: "Explore places with recently added or reviewed accessibility evidence.",
    viewAll: "View all places",
    lastUpdated: "Last updated",
    howEyebrow: "Three clear steps",
    howTitle: "How MUTAH works",
    howBody: "A simple journey from search to evidence to a decision before arrival.",
    steps: [
      {
        title: "Explore",
        body: "Search places and understand access information before your visit.",
      },
      {
        title: "Contribute",
        body: "Add photos and information from your experience to help others.",
      },
      {
        title: "Human verification",
        body: "Evidence is reviewed before publication for accuracy and trust.",
      },
    ],
    aiKicker: "From image to a clearer decision",
    aiTitle: "AI observes. Humans verify.",
    aiBody:
      "MUTAH extracts visible access evidence from images, keeps uncertainty explicit, and requires human review before publication.",
    aiObserves: "AI observes only what is visible in the evidence.",
    humansVerify: "A person verifies the evidence and its context before publication.",
    notVisiblePrinciple: "Not Visible does not mean Absent.",
    noAutoPublish: "No automatic publishing and no global accessibility score.",
    publishAfterReview: "Published after review",
    contributeEyebrow: "Community builds trust",
    contributeTitle: "One piece of information can open the way for someone else",
    contributeBody:
      "A recent photo or simple update can help someone else make a clearer decision before visiting.",
    contributeCta: "Contribute now",
    heroVisualLabel: "From uncertainty to clarity before the journey",
    noPhoto: "No photo",
    footerLine: "Know before you go.",
  },
};
