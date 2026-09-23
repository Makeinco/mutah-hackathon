import { Link } from "@tanstack/react-router";
import { Camera, Compass, Home, Shapes, UserRound } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MutahLogo } from "./Logo";
import { UI, useLang } from "@/lib/mutah/i18n";
import { cn } from "@/lib/utils";

export type SiteNavItem = {
  to: "/" | "/discover" | "/contribute" | "/ecosystem" | "/account";
  key: keyof typeof UI;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  primary?: boolean;
};

export const SITE_NAV_ITEMS: readonly SiteNavItem[] = [
  { to: "/", key: "navHome", icon: Home },
  { to: "/discover", key: "navDiscover", icon: Compass },
  { to: "/contribute", key: "navContribute", icon: Camera, primary: true },
  { to: "/ecosystem", key: "navMutah", icon: Shapes },
  { to: "/account", key: "navAccount", icon: UserRound },
] as const;

export function SiteHeader({
  title,
  wide = false,
}: {
  title?: string | undefined;
  wide?: boolean;
}) {
  const { t } = useLang();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div
        className={cn(
          "mx-auto flex items-center justify-between gap-3 px-4 py-3",
          wide ? "max-w-7xl" : "max-w-5xl",
        )}
      >
        <Link to="/" aria-label={`${t("brand")} — ${t("home")}`} className="shrink-0">
          <MutahLogo className="h-9" />
        </Link>
        {title ? (
          <p className="hidden truncate text-sm font-semibold text-muted-foreground sm:block">
            {title}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <nav aria-label={t("mainNav")} className="hidden items-center gap-1 md:flex">
            {SITE_NAV_ITEMS.map(({ to, key, primary }) => {
              const activeProps = {
                activeProps: {
                  className: primary
                    ? "ring-2 ring-primary ring-offset-2"
                    : "bg-primary-soft text-primary",
                },
              };
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                    primary
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-foreground hover:bg-muted",
                  )}
                  {...activeProps}
                >
                  {t(key)}
                </Link>
              );
            })}
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
