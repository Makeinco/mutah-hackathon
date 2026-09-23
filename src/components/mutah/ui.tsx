import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Buttons ------------------------------------------------------------------ */

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition-[color,background-color,border-color,transform,box-shadow] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        access:
          "bg-access text-primary-foreground hover:bg-access-strong",
        outline: "border-2 border-input bg-background text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        quiet: "text-primary hover:bg-primary-soft",
        danger: "border-2 border-destructive text-destructive hover:bg-destructive/10",
      },
      size: {
        lg: "min-h-14 px-6 text-base",
        md: "min-h-12 px-5 text-base",
        sm: "min-h-11 px-4 text-sm",
        icon: "min-h-11 min-w-11",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, block, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}

/* Surfaces ----------------------------------------------------------------- */

export function Card({
  className,
  children,
  as: As = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "article" | "li" | "section";
}) {
  return (
    <As className={cn("mutah-surface rounded-2xl border border-border bg-card p-5", className)}>{children}</As>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold">{children}</h2>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* Inputs ------------------------------------------------------------------- */

export function TextField({
  label,
  hint,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) {
  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "min-h-12 w-full rounded-xl border-2 border-input bg-background px-4 text-base placeholder:text-muted-foreground",
          className,
        )}
        {...props}
      />
      {hint ? (
        <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/* Chips -------------------------------------------------------------------- */

export function Chip({
  children,
  selected,
  onClick,
  pressedLabel,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  pressedLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={pressedLabel}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition-colors",
        selected
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-background text-foreground hover:bg-muted",
      )}
    >
      {selected ? <span aria-hidden="true">✓ </span> : null}
      {children}
    </button>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "access" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        tone === "brand" && "bg-primary-soft text-primary",
        tone === "access" && "bg-access-soft text-access-strong",
        tone === "warn" && "bg-caution-soft text-caution",
        tone === "neutral" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

/* States ------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-surface/60 px-6 py-12 text-center">
      <p className="text-base font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">جاري التحميل</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
