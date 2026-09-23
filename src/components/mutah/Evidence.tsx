import {
  ArrowUpNarrowWide,
  Accessibility,
  CircleHelp,
  Check,
  DoorOpen,
  EyeOff,
  Grip,
  Footprints,
  Minus,
  MoveUpRight,
  ParkingSquare,
  Route as RouteIcon,
  TriangleAlert,
  Waypoints,
} from "lucide-react";
import type { ComponentType } from "react";
import { useLang } from "@/lib/mutah/i18n";
import { INDICATOR_LABEL, stateLabel } from "@/lib/mutah/labels";
import type { IndicatorEvidence, IndicatorKey, IndicatorState } from "@/lib/mutah/types";
import { cn } from "@/lib/utils";

export const INDICATOR_ICON: Record<IndicatorKey, ComponentType<{ className?: string }>> = {
  path_surface: Footprints,
  curb_ramp: MoveUpRight,
  steps: ArrowUpNarrowWide,
  ramp: Waypoints,
  handrail: Grip,
  obstruction: TriangleAlert,
  parking: ParkingSquare,
  parking_route: RouteIcon,
  elevator: MoveUpRight,
  elevator_space: Accessibility,
  accessible_restroom: Accessibility,
  restroom_door: DoorOpen,
};

/** State treatment: shape + icon + words. Colour is never the only signal. */
const STATE_STYLE: Record<
  IndicatorState,
  { icon: ComponentType<{ className?: string }>; chip: string }
> = {
  present: { icon: Check, chip: "bg-access-soft text-access-strong border-access" },
  absent: { icon: Minus, chip: "bg-muted text-foreground border-input" },
  not_visible: { icon: EyeOff, chip: "bg-unknown-soft text-unknown border-input border-dashed" },
  not_documented: { icon: EyeOff, chip: "bg-unknown-soft text-unknown border-input border-dashed" },
  conflicting: { icon: TriangleAlert, chip: "bg-warn-soft text-warn-strong border-warn" },
  unknown: { icon: CircleHelp, chip: "bg-unknown-soft text-unknown border-input border-dashed" },
  not_applicable: { icon: Minus, chip: "bg-muted text-muted-foreground border-input" },
};

export function StateChip({ indicator, state }: { indicator: IndicatorKey; state: IndicatorState }) {
  const { pick } = useLang();
  const style = STATE_STYLE[state] ?? STATE_STYLE.unknown;
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-bold",
        style.chip,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {pick(stateLabel(indicator, state))}
    </span>
  );
}

export function EvidenceItem({
  evidence,
  compact = false,
}: {
  evidence: IndicatorEvidence;
  compact?: boolean;
}) {
  const { pick } = useLang();
  const Icon = INDICATOR_ICON[evidence.key];
  const uncertain =
    evidence.state === "unknown" ||
    evidence.state === "not_visible" ||
    evidence.state === "not_documented" ||
    evidence.state === "conflicting";
  return (
    <li
      className={cn(
        "flex gap-3 rounded-xl border p-4 transition-colors",
        uncertain ? "border-dashed border-input bg-unknown-soft/60" : "border-border bg-card",
      )}
    >
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold">{pick(INDICATOR_LABEL[evidence.key])}</span>
          <StateChip indicator={evidence.key} state={evidence.state} />
        </div>
        {!compact ? <p className="mt-1.5 text-sm text-muted-foreground">{pick(evidence.note)}</p> : null}
      </div>
    </li>
  );
}

export function EvidenceList({ items }: { items: IndicatorEvidence[] }) {
  return <ul className="space-y-3">{items.map((e) => <EvidenceItem key={e.key} evidence={e} />)}</ul>;
}
