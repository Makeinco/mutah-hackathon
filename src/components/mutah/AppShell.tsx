import type { ReactNode } from "react";
import { SiteBottomNav } from "./SiteBottomNav";
import { SiteHeader } from "./SiteHeader";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  title,
  wide = false,
}: {
  children: ReactNode;
  title?: string;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader title={title} wide={wide} />

      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "door-reveal mx-auto w-full flex-1 px-4 pb-28 pt-6 md:pb-12",
          wide ? "max-w-7xl" : "max-w-5xl",
        )}
      >
        {children}
      </main>

      <SiteBottomNav />
    </div>
  );
}
