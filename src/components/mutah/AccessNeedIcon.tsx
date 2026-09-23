import type { SVGProps } from "react";
import type { AccessNeed } from "@/lib/mutah/types";
import { cn } from "@/lib/utils";

export function AccessNeedIcon({
  need,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { need: AccessNeed }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-6", className)}
      {...props}
    >
      {need === "step_free" ? (
        <>
          <path d="M3 18h7c3.5 0 3.5-4 7-4h4" />
          <path d="M15 4h6v16h-6" />
          <path d="M18 7v4" />
        </>
      ) : need === "ramp_when_raised" ? (
        <>
          <path d="M3 19h18" />
          <path d="m5 18 11-8h5" />
          <path d="m14 8 2 2-2 2" />
        </>
      ) : need === "clear_path" ? (
        <>
          <path d="M5 4 3 20M19 4l2 16" />
          <path d="M8 12h8" />
          <path d="m13 9 3 3-3 3" />
        </>
      ) : need === "handrail" ? (
        <>
          <path d="M4 9h13a3 3 0 0 1 3 3" />
          <path d="M6 9v10M17 10v9" />
          <path d="M4 6h13" />
        </>
      ) : need === "parking" ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M8 17V7h4.25a3 3 0 0 1 0 6H8" />
          <path d="M15.5 17h2.5" />
        </>
      ) : need === "elevator" ? (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M12 9v12M8 7l2-2 2 2M16 5l2 2-2 2" />
        </>
      ) : (
        <>
          <path d="M4 20V5h16v15" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="M9 11.5v4M6.5 13.5h5M15 12h3v5h-4M14 17h5" />
        </>
      )}
    </svg>
  );
}
