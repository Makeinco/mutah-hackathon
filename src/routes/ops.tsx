import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  ClipboardCheck,
  CircleAlert,
  FileWarning,
  History,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/mutah/AppShell";
import { RoleGate } from "@/components/mutah/RoleGate";
import { OperationsWorkspace } from "@/components/mutah/OperationsWorkspace";
import { Button, Card } from "@/components/mutah/ui";
import { useAuth } from "@/lib/mutah/auth";
import { useLang } from "@/lib/mutah/i18n";
import { getOpsOverview, type OpsOverview } from "@/lib/mutah/operational";

export const Route = createFileRoute("/ops")({
  head: () => ({
    meta: [
      { title: "مركز عمليات مُتاح | MUTAH Operations" },
      {
        name: "description",
        content: "مساحة تشغيلية محمية لفريق مُتاح: المراجعة وإدارة المرافق وجودة البيانات.",
      },
    ],
  }),
  component: OperationsPage,
});

const ITEMS = [
  {
    icon: ClipboardCheck,
    ar: "قائمة المراجعة",
    en: "Review queue",
    bodyAr: "مراجعة حزم الأدلة قبل النشر.",
    bodyEn: "Review evidence bundles before publishing.",
    to: "/review" as const,
    kind: "action" as const,
  },
  {
    icon: Building2,
    ar: "المرافق",
    en: "Facilities",
    bodyAr: "إدارة هوية المرافق ومناطق التوثيق.",
    bodyEn: "Manage facility identity and evidence zones.",
    href: "#facility-management",
    kind: "action" as const,
  },
  {
    icon: UsersRound,
    ar: "المساهمون",
    en: "Contributors",
    bodyAr: "متابعة المساهمات دون إنشاء ملفات شخصية تدخّلية.",
    bodyEn: "Track contributions without invasive profiling.",
    kind: "context" as const,
  },
  {
    icon: FileWarning,
    ar: "البلاغات",
    en: "Reports",
    bodyAr: "بلاغات التغيير المفتوحة وقراراتها.",
    bodyEn: "Open change reports and their decisions.",
    href: "#reports",
    kind: "action" as const,
  },
  {
    icon: ShieldCheck,
    ar: "جودة البيانات",
    en: "Data quality",
    bodyAr: "الأدلة القديمة والمناطق غير الموثقة والتعارضات.",
    bodyEn: "Stale evidence, missing zones, and conflicts.",
    kind: "context" as const,
  },
  {
    icon: History,
    ar: "سجل التدقيق",
    en: "Audit log",
    bodyAr: "من اتخذ القرار ومتى ولماذا.",
    bodyEn: "Who made a decision, when, and why.",
    kind: "context" as const,
  },
];

function OperationsPage() {
  const { canReview } = useAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [overview, setOverview] = useState<OpsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setOverview(await getOpsOverview());
    } catch (cause) {
      console.error("Could not load MUTAH operations overview", cause);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canReview) void load();
  }, [canReview]);

  const metrics = overview
    ? [
        { ar: "قيد المراجعة", en: "Pending review", value: overview.pending_review },
        { ar: "تحتاج توضيحًا", en: "Need clarification", value: overview.clarification_requested },
        { ar: "بلاغات مفتوحة", en: "Open reports", value: overview.open_reports },
        { ar: "أدلة قديمة", en: "Stale facilities", value: overview.stale_facilities },
        { ar: "مساهمون", en: "Contributors", value: overview.contributors },
        { ar: "مساهمات معتمدة", en: "Approved contributions", value: overview.approved },
        { ar: "مقترحات للمراجعة", en: "Proposals pending", value: overview.proposals_pending },
        {
          ar: "توضيح المقترحات",
          en: "Proposal clarifications",
          value: overview.proposals_clarification,
        },
        {
          ar: "موصى بها للمدير",
          en: "Recommended proposals",
          value: overview.proposals_recommended,
        },
        { ar: "مرافق رسمية", en: "Official facilities", value: overview.official_facilities },
        { ar: "مرافق مؤرشفة", en: "Archived facilities", value: overview.archived_facilities },
      ]
    : [];

  return (
    <AppShell title={ar ? "مركز عمليات مُتاح" : "MUTAH Operations"} wide>
      <RoleGate allow={["reviewer", "admin"]}>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">MUTAH Operations</p>
              <h1 className="mt-2 text-3xl font-bold">
                {ar ? "مركز عمليات مُتاح" : "MUTAH Operations"}
              </h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                {ar
                  ? "مساحة العمل الداخلية للمراجعة والإدارة والنشر. لا تظهر هذه الأدوات ضمن تنقل المستخدم العام."
                  : "The internal workspace for review, management, and publication. These tools never appear in the public navigation."}
              </p>
            </div>
            <Button size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              {ar ? "تحديث" : "Refresh"}
            </Button>
          </div>

          {loading ? (
            <Card className="mt-8 flex items-center gap-3">
              <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
              <p className="font-semibold">
                {ar ? "جاري تحميل حالة التشغيل…" : "Loading operational status…"}
              </p>
            </Card>
          ) : error ? (
            <Card className="mt-8">
              <div className="flex items-start gap-3">
                <CircleAlert
                  className="mt-0.5 size-5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">
                    {ar
                      ? "تعذر تحميل المؤشرات التشغيلية الآن."
                      : "Operational metrics could not be loaded."}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ar
                      ? "لم يؤثر ذلك على البيانات؛ حاول التحديث مرة أخرى."
                      : "No data was changed; try refreshing again."}
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => void load()}>
                    <RefreshCw className="size-4" aria-hidden="true" />
                    {ar ? "إعادة المحاولة" : "Try again"}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {metrics.map((metric) => (
                <Card key={metric.en} className="p-4">
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {ar ? metric.ar : metric.en}
                  </p>
                </Card>
              ))}
            </div>
          )}

          {overview ? (
            <Card className="mt-6 border-primary/25 bg-primary-soft/30">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {ar ? "يتطلب قرارًا الآن" : "Requires a decision now"}
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {overview.pending_review +
                      overview.proposals_recommended +
                      overview.open_reports}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {ar
                      ? "مساهمات بانتظار المراجعة، ومقترحات موصى بها، وبلاغات مفتوحة."
                      : "Pending contributions, recommended proposals, and open reports."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/review"
                    className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    {ar ? "فتح قرارات المراجعة" : "Open review decisions"}
                  </Link>
                  <a
                    href="#reports"
                    className="inline-flex min-h-11 items-center rounded-xl border-2 border-input bg-background px-4 py-2 text-sm font-semibold"
                  >
                    {ar ? "فتح البلاغات" : "Open reports"}
                  </a>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ITEMS.map(({ icon: Icon, ar: arTitle, en, bodyAr, bodyEn, kind, ...item }) => {
              const content = (
                <Card className="h-full transition-colors hover:border-primary/40">
                  <Icon className="size-6 text-primary" aria-hidden="true" />
                  <h2 className="mt-4 text-lg font-bold">{ar ? arTitle : en}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{ar ? bodyAr : bodyEn}</p>
                  {"to" in item || "href" in item ? (
                    <p className="mt-4 text-sm font-semibold text-primary">{ar ? "فتح" : "Open"}</p>
                  ) : (
                    <p className="mt-4 text-xs font-semibold text-muted-foreground">
                      {kind === "context"
                        ? ar
                          ? "ملخص معلوماتي من بيانات التشغيل الحالية"
                          : "Informational summary from current operations data"
                        : ar
                          ? "إجراء تشغيلي"
                          : "Operational action"}
                    </p>
                  )}
                </Card>
              );
              return "to" in item ? (
                <Link
                  key={arTitle}
                  to={item.to}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {content}
                </Link>
              ) : "href" in item ? (
                <a
                  key={arTitle}
                  href={item.href}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {content}
                </a>
              ) : (
                <div key={arTitle}>{content}</div>
              );
            })}
          </div>
          <OperationsWorkspace />
        </div>
      </RoleGate>
    </AppShell>
  );
}
