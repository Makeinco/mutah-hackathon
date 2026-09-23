import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/mutah/AppShell";
import { MutahLogo } from "@/components/mutah/Logo";
import { Card, SectionTitle } from "@/components/mutah/ui";
import { useLang } from "@/lib/mutah/i18n";
import { INDICATOR_LABEL, ZONE_INDICATORS, ZONE_LABEL, ZONE_ORDER } from "@/lib/mutah/labels";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن مُتاح | مُتاح ماب" },
      {
        name: "description",
        content:
          "مُتاح ماب منصة قرار عن الوصول: أدلة مرئية متعددة، الذكاء الاصطناعي يرصد، والبشر يتحققون، وعدم اليقين يبقى ظاهرًا.",
      },
      { property: "og:title", content: "عن مُتاح | مُتاح ماب" },
      { property: "og:description", content: "الأدلة → الفهم → القرار." },
    ],
  }),
  component: About,
});

function About() {
  const { t, pick, lang } = useLang();
  const ar = lang === "ar";

  return (
    <AppShell title={t("navAbout")}>
      <div className="mx-auto max-w-2xl">
        <MutahLogo className="h-14" />
        <h1 className="mt-8 text-2xl font-bold">{t("tagline")}</h1>
        <p className="mt-3 text-muted-foreground">
          {ar
            ? "مُتاح ماب يساعدك على فهم ما ينتظرك في المكان قبل الزيارة، اعتمادًا على أدلة مرئية من مناطق مختارة داخل وخارج المرفق: ماذا نعرف؟ وما الذي لا نعرفه؟ ولماذا؟"
            : "MUTAH MAP helps you understand what to expect before a visit using visual evidence from selected areas inside and outside a facility: what we know, what we do not know, and why."}
        </p>

        <div className="mt-10">
          <SectionTitle>
            {ar ? "الذكاء الاصطناعي يرصد، والبشر يتحققون" : "AI observes, humans verify"}
          </SectionTitle>
          <Card className="bg-surface">
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              {(ar
                ? [
                    "اختيار منطقة المرفق",
                    "صورة أو أكثر للمنطقة",
                    "فحص الجودة والخصوصية",
                    "رصد أولي لما يظهر",
                    "تأكيد المساهم أو تصحيحه",
                    "مراجعة بشرية",
                    "نشر الأدلة المراجعة",
                  ]
                : [
                    "Choose a facility zone",
                    "One or more images of that zone",
                    "Quality and privacy checks",
                    "Preliminary observation of what is visible",
                    "Contributor confirmation or correction",
                    "Human review",
                    "Publication of reviewed evidence",
                  ]
              ).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </Card>
          <p className="mt-3 text-sm text-muted-foreground">
            {ar
              ? "لا يمنح مُتاح شهادة إتاحة لأي مبنى، ولا يعرض درجة أو نسبة عامة للمرفق، ولا يستنتج القياسات الدقيقة من الصور. الأدلة أهم من الدرجة."
              : "MUTAH never certifies a building, never shows an overall facility score, and does not infer exact measurements from images. Evidence matters more than a rating."}
          </p>
        </div>

        <div className="mt-10">
          <SectionTitle
            hint={
              ar
                ? "خمس مناطق أدلة، ويمكن أن تحتوي كل منطقة على عدة صور."
                : "Five evidence zones, each of which may contain multiple images."
            }
          >
            {ar ? "نطاق الأدلة" : "Evidence scope"}
          </SectionTitle>
          <ul className="space-y-4">
            {ZONE_ORDER.map((z) => (
              <li key={z} className="rounded-2xl border border-border p-4">
                <h3 className="font-bold">{pick(ZONE_LABEL[z])}</h3>
                <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                  {ZONE_INDICATORS[z].map((k) => (
                    <li key={k}>{pick(INDICATOR_LABEL[k])}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            {ar
              ? "«خارج إطار الصور» و«غير موثق بعد» لا يعنيان «غير موجود». وإذا تعارضت الأدلة، تبقى الحالة متعارضة حتى المراجعة البشرية."
              : '“Outside the image frame” and “not documented yet” do not mean “absent.” If evidence conflicts, it remains conflicting until human review.'}
          </p>
        </div>

        <div className="mt-10">
          <SectionTitle>{ar ? "تجارب مخصصة للأدوار" : "Role-specific experiences"}</SectionTitle>
          <div className="flex flex-wrap gap-3">
            {(
              [
                { to: "/ecosystem", label: t("navEcosystem") },
                { to: "/review", label: t("navReview") },
                { to: "/insights", label: t("navInsights") },
              ] as const
            ).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="min-h-12 rounded-xl border-2 border-input px-5 py-3 text-sm font-semibold hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
