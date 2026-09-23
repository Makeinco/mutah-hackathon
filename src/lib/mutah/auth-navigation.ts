import type { FocusIndicator } from "./guide-assets";
import type { ZoneKey } from "./types";

const DEFAULT_AUTH_RETURN = "/account";

export function safeAuthReturn(value: string | null | undefined, fallback = DEFAULT_AUTH_RETURN) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const parsed = new URL(value, "https://mutah.invalid");
    if (parsed.origin !== "https://mutah.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function authCallbackUrl(next?: string) {
  if (typeof window === "undefined") return undefined;
  const callback = new URL("/auth/confirm", window.location.origin);
  callback.searchParams.set("next", safeAuthReturn(next));
  return callback.toString();
}

export function contributionReturnPath(facilityId: string, zone: ZoneKey, focus: FocusIndicator) {
  const path = `/contribute/${encodeURIComponent(facilityId)}`;
  const search = new URLSearchParams({ zone, focus });
  return `${path}?${search.toString()}#capture-title`;
}

export function facilityPhotoReturnPath(facilityId: string) {
  return `/facility/${encodeURIComponent(facilityId)}#facility-photo-proposal`;
}
