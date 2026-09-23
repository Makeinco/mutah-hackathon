import logoAsset from "@/assets/mutah-logo.svg";
import iconAsset from "@/assets/mutah-icon.svg";
import { cn } from "@/lib/utils";

/** Locked MUTAH brand assets sourced from the approved logo PDFs. */
export function MutahLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset}
      alt="مُتاح | MUTAH"
      width={340}
      height={208}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}

export function MutahMark({ className }: { className?: string }) {
  return (
    <img
      src={iconAsset}
      alt=""
      aria-hidden="true"
      width={64}
      height={70}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
