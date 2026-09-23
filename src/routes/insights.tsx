import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/mutah/AppShell";
import { Card, SectionTitle, Tag } from "@/components/mutah/ui";
import { useLang } from "@/lib/mutah/i18n";
import { INDICATOR_LABEL, INDICATOR_ORDER } from "@/lib/mutah/labels";
import { useMutah } from "@/lib/mutah/store";
import type { IndicatorKey } from "@/lib/mutah/types";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "مُتاح إنسايتس | مُتاح ماب" },
      {
        name: "description",
        content: "عرض بيانات تجريبية: تغطية مناطق الأدلة، المساهمات، اكتمال البيانات، والحواجز المرصودة.",
      },
      { property: "og:title", content: "مُتاح إنسايتس | مُتاح ماب" },
      {
        property: "og:description",
        content: "بيانات تجريبية للعرض فقط، بلا أرقام وطنية وبلا ترتيب للمدن.",
      },
    ],
  }),
  component: Insights,
});

const BARRIER_WHEN_PRESENT: IndicatorKey[] = ["steps", "obstruction"];

function Insights() {
  const { facilities, contributions } = useMutah();
  const { pick, lang, t } = useLang();
  const ar = lang === "ar";

  const totalImages = facilities.reduce(
    (sum, facility) =>
      sum + Object.values(facility.zones).reduce((zoneSum, zone) => zoneSum + zone.images.length, 0),
    0,
  );
  const reviewed = contributions.filter((c) => c.status === "approved").length;
  const totalKnown = facilities.reduce(
    (sum, f) =>
      sum +
      INDICATOR_ORDER.filter((k) => {
        const s = f.indicators[k].state;
        return s === "present" || s === "absent" || s === "not_applicable";
      }).length,
    0,
  );
  const denominator = Math.max(1, facilities.length * INDICATOR_ORDER.length);
  const completeness = Math.round((totalKnown / denominator) * 100);
  const needsUpdate = facilities.filter((f) => f.verification === "stale").length;
  const documentedZones = facilities.reduce(
    (sum, f) => sum + Object.values(f.zones).filter((z) => z.documented).length,
    0,
  );

  const barriers = INDICATOR_ORDER.map((k) => ({
    key: k,
    count: facilities.filter((f) =>
      BARRIER_WHEN_PRESENT.includes(k)
        ? f.indicators[k].state === "present"
        : f.indicators[k].state === "absent",
    ).length,
  }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxBarrier = Math.max(1, ...barriers.map((b) => b.count));

  const barrierLabel = (k: IndicatorKey) =>
    BARRIER_WHEN_PRESENT.includes(k)
      ? pick(INDICATOR_LABEL[k])
      : `${ar ? "غياب" : "Missing"}: ${pick(INDICATOR_LABEL[k])}`;

  return (
    <AppShell title={t("navInsights")} wide>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t("navInsights")}</h1>
        <Tag tone="brand">{ar ? "بيانات المرحلة التجريبية" : "Pilot data"}</Tag>
      </div>
      <p className="mt-1 max-w-3xl text-muted-foreground">
        {ar
          ? "تلخّص هذه الأرقام البيانات المتاحة حاليًا في تجربة مُتاح. هي ليست مؤشرات وطنية ولا ترتيبًا للمدن، وقد تتغير مع مراجعة أدلة جديدة."
          : "These figures summarise the data currently available in the MUTAH pilot. They are not national indicators or city rankings and may change as new evidence is reviewed."}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label={ar ? "المرافق في المرحلة التجريبية" : "Pilot facilities"} value={facilities.length} />
        <Metric label={ar ? "صور الأدلة" : "Evidence images"} value={totalImages} />
        <Metric label={ar ? "مناطق الأدلة الموثقة" : "Documented evidence zones"} value={documentedZones} />
        <Metric label={ar ? "مساهمات معتمدة" : "Approved contributions"} value={reviewed} />
        <Metric
          label={ar ? "اكتمال البيانات المتاحة" : "Available data completeness"}
          value={`${completeness}%`}
        />
        <Metric label={ar ? "مرافق تحتاج تحديثًا" : "Facilities needing updates"} value={needsUpdate} />
      </div>

      <section aria-labelledby="barriers-title" className="mt-10">
        <div id="barriers-title">
          <SectionTitle
            hint={
              ar
                ? "عدّ وصفي داخل بيانات المرحلة التجريبية الحالية، وليس ترتيبًا أو مؤشرًا رسميًا."
                : "A descriptive count within the current pilot data, not a ranking or official indicator."
            }
          >
            {ar ? "الحواجز المرصودة في البيانات المتاحة" : "Barriers observed in available data"}
          </SectionTitle>
        </div>

        <Card>
          {barriers.length > 0 ? (
            <>
              <ul className="space-y-4" aria-hidden="true">
                {barriers.map((b) => (
                  <li key={b.key}>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>{barrierLabel(b.key)}</span>
                      <span>{b.count}</span>
                    </div>
                    <div className="mt-1 h-3 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-700"
                        style={{ width: `${(b.count / maxBarrier) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              <table className="mt-6 w-full text-start text-sm">
                <caption className="mb-2 text-start font-semibold">
                  {ar ? "جدول بديل للحواجز المرصودة" : "Alternative table of observed barriers"}
                </caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="py-2 text-start">
                      {ar ? "الحاجز" : "Barrier"}
                    </th>
                    <th scope="col" className="py-2 text-start">
                      {ar ? "عدد المرافق" : "Facilities"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {barriers.map((b) => (
                    <tr key={b.key} className="border-b border-border/60">
                      <td className="py-2">{barrierLabel(b.key)}</td>
                      <td className="py-2">{b.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {ar ? "لا توجد حواجز موثقة في بيانات العرض الحالية." : "No barriers are documented in the current demo data."}
            </p>
          )}
        </Card>
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="door-reveal">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </Card>
  );
}
