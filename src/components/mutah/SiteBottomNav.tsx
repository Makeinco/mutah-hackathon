import { Link } from "@tanstack/react-router";
import { SITE_NAV_ITEMS } from "./SiteHeader";
import { useLang } from "@/lib/mutah/i18n";
import { cn } from "@/lib/utils";

export function SiteBottomNav() {
  const { t } = useLang();

  return (
    <nav
      aria-label={t("bottomNav")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/98 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-1 pb-[max(.25rem,env(safe-area-inset-bottom))]">
        {SITE_NAV_ITEMS.map(({ to, key, icon: Icon, primary }) => {
          const activeProps = { activeProps: { className: "text-primary" } };
          return (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold text-muted-foreground transition-all duration-200",
                  primary && "-translate-y-3 text-foreground",
                )}
                {...activeProps}
              >
                <span
                  className={cn(
                    "flex items-center justify-center",
                    primary
                      ? "size-14 rounded-2xl border-4 border-background bg-primary text-primary-foreground shadow-[var(--shadow-raised)]"
                      : "size-7",
                  )}
                >
                  <Icon className={primary ? "size-7" : "size-6"} aria-hidden="true" />
                </span>
                <span className={cn(primary && "-mt-0.5")}>{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
