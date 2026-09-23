import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { MutahProvider } from "../lib/mutah/store";
import { LangProvider, useLang } from "../lib/mutah/i18n";
import { AuthProvider } from "../lib/mutah/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" lang="ar" dir="rtl">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-primary">مُتاح ماب | MUTAH MAP</p>
        <h1 className="mt-3 text-5xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-base text-muted-foreground">
          ربما تغيّر الرابط. يمكنك العودة إلى الرئيسية أو استكشاف الأماكن من جديد.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            العودة إلى الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" lang="ar" dir="rtl">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-primary">مُتاح ماب | MUTAH MAP</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">تعذر تحميل الصفحة</h1>
        <p className="mt-2 text-base text-muted-foreground">
          حدث خطأ غير متوقع. جرّب مرة أخرى، أو عد إلى الرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            حاول مرة أخرى
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "مُتاح ماب | اعرف قبل أن تصل" },
      {
        name: "description",
        content:
          "أدلة وصول مرئية متعددة تساعدك على فهم المرفق وفق احتياجاتك قبل الزيارة، مع توضيح ما هو موثق وما يحتاج إلى دليل إضافي.",
      },
      { name: "author", content: "MUTAH" },
      { property: "og:title", content: "مُتاح ماب | اعرف قبل أن تصل" },
      {
        property: "og:description",
        content: "أدلة الوصول أولًا: ما نعرفه، ما لا نعرفه، ولماذا — قبل أن تصل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", type: "image/svg+xml", href: "/mutah-icon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <SkipLink />
        <AuthProvider>
          <MutahProvider>
            <Outlet />
          </MutahProvider>
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

function SkipLink() {
  const { t } = useLang();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
    >
      {t("skipToContent")}
    </a>
  );
}
