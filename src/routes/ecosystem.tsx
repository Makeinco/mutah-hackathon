import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  BriefcaseBusiness,
  HeartPulse,
  MapPinned,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";
import { AppShell } from "@/components/mutah/AppShell";
import { Card } from "@/components/mutah/ui";
import { bi, useLang } from "@/lib/mutah/i18n";
import type { L } from "@/lib/mutah/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ecosystem")({
  head: () => ({
    meta: [
      { title: "مُتاح | منظومة الوصول" },
      {
        name: "description",
        content:
          "منظومة مُتاح: مُتاح ماب هو المنتج الحالي، مع خدمات مستقبلية وطبقة إنسايتس قيد التطوير.",
      },
    ],
  }),
  component: MutahEcosystem,
});

type ServiceStatus = "current" | "future" | "pilot";

interface Service {
  id: string;
  icon: ComponentType<{ className?: string }>;
  name: L;
  english: string;
  body: L;
  status: ServiceStatus;
  to?: "/discover" | "/insights";
}

const SERVICES: Service[] = [
  {
    id: "map",
    icon: MapPinned,
    name: bi("مُتاح ماب", "MUTAH MAP"),
    english: "MUTAH MAP",
    body: bi(
      "أدلة موثقة تساعدك على فهم إتاحة المرافق قبل الزيارة.",
      "Verified evidence that helps you understand facility access before visiting.",
    ),
    status: "current",
    to: "/discover",
  },
  {
    id: "care",
    icon: HeartPulse,
    name: bi("مُتاح كير", "MUTAH CARE"),
    english: "MUTAH CARE",
    body: bi(
      "وصول أسهل إلى الخدمات الصحية والتأهيلية المناسبة.",
      "Easier access to relevant health and rehabilitation services.",
    ),
    status: "future",
  },
  {
    id: "market",
    icon: ShoppingBag,
    name: bi("مُتاح ماركت", "MUTAH MARKET"),
    english: "MUTAH MARKET",
    body: bi(
      "اكتشاف ومقارنة الأجهزة والحلول المساعدة بسهولة.",
      "Discover and compare assistive products and solutions more easily.",
    ),
    status: "future",
  },
  {
    id: "works",
    icon: BriefcaseBusiness,
    name: bi("مُتاح ووركس", "MUTAH WORKS"),
    english: "MUTAH WORKS",
    body: bi(
      "تمكين مهني وربط أكثر ذكاءً بين المهارات والفرص.",
      "Professional empowerment and smarter connections between skills and opportunities.",
    ),
    status: "future",
  },
  {
    id: "connect",
    icon: UsersRound,
    name: bi("مُتاح كونكت", "MUTAH CONNECT"),
    english: "MUTAH CONNECT",
    body: bi(
      "مجتمع آمن يربط الأفراد والأسر والجهات ويعزز الدعم والتواصل.",
      "A safe community connecting individuals, families and organisations.",
    ),
    status: "future",
  },
  {
    id: "insights",
    icon: BarChart3,
    name: bi("مُتاح إنسايتس", "MUTAH INSIGHTS"),
    english: "MUTAH INSIGHTS",
    body: bi(
      "تحويل بيانات الإتاحة إلى مؤشرات تساعد المرافق وصنّاع القرار.",
      "Turning accessibility data into insights for facilities and decision-makers.",
    ),
    status: "pilot",
    to: "/insights",
  },
];

function StatusLabel({ status }: { status: ServiceStatus }) {
  const { lang } = useLang();
  const copy = {
    current: lang === "ar" ? "الحالي" : "Current",
    future: lang === "ar" ? "مستقبلي" : "Future",
    pilot: lang === "ar" ? "قيد التطوير · Pilot" : "Pilot · In development",
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold",
        status === "current" ? "text-primary" : status === "pilot" ? "text-access-strong" : "text-muted-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          status === "current" ? "bg-primary" : status === "pilot" ? "bg-access-strong" : "bg-muted-foreground/50",
        )}
      />
      {copy}
    </span>
  );
}

function MutahEcosystem() {
  const { pick, lang } = useLang();
  const ar = lang === "ar";

  return (
    <AppShell title={ar ? "مُتاح" : "MUTAH"} wide>
      <div className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">{ar ? "المنظومة الأم" : "The MUTAH ecosystem"}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{ar ? "مُتاح" : "MUTAH"}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            {ar
              ? "مُتاح ماب هو المنتج العامل الآن. بقية الخدمات تظهر كامتداد مستقبلي واضح، بينما مُتاح إنسايتس طبقة قيد التطوير مرتبطة ببيانات التجربة."
              : "MUTAH MAP is the product working today. The remaining services are clearly presented as future extensions, while MUTAH INSIGHTS is an in-development data layer tied to pilot evidence."}
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            const current = service.status === "current";
            const content = (
              <Card
                className={cn(
                  "h-full transition-transform duration-200 hover:-translate-y-0.5",
                  current && "border-primary/40 bg-primary-soft/25 ring-1 ring-primary/10 lg:col-span-1",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl border",
                      current
                        ? "border-primary/20 bg-primary text-primary-foreground"
                        : service.status === "pilot"
                          ? "border-access/30 bg-access-soft text-access-strong"
                          : "border-border bg-surface text-foreground",
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <StatusLabel status={service.status} />
                </div>
                <h2 className="mt-5 text-lg font-bold">{pick(service.name)}</h2>
                <p className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground">{service.english}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{pick(service.body)}</p>
                {current ? (
                  <p className="mt-5 text-sm font-semibold text-primary">{ar ? "اعرف قبل أن تصل" : "Know Before You Go"}</p>
                ) : null}
              </Card>
            );

            return service.to ? (
              <Link
                key={service.id}
                to={service.to}
                className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {content}
              </Link>
            ) : (
              <div key={service.id}>{content}</div>
            );
          })}
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-base font-semibold">
            {ar
              ? "مُتاح ماب هو الخطوة الأولى، ومُتاح هي المنظومة الكاملة."
              : "MUTAH MAP is the first step; MUTAH is the full ecosystem."}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
