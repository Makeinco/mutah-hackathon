/**
 * MUTAH MAP — domain types.
 * UI never talks to a backend directly; it talks to the repository in `data.ts`
 * and the AI adapter in `ai.ts`. Both can later be swapped for Supabase / Gemini.
 */

/** Bilingual string. Every user-visible piece of content carries both languages. */
export interface L {
  ar: string;
  en: string;
}

export type Lang = "ar" | "en";

/** The five evidence zones a facility can be documented through. */
export type ZoneKey = "approach" | "entrance" | "parking" | "elevator" | "restroom";

/** Visible indicators, grouped by the zone they belong to. */
export type IndicatorKey =
  | "path_surface"
  | "curb_ramp"
  | "steps"
  | "ramp"
  | "handrail"
  | "obstruction"
  | "parking"
  | "parking_route"
  | "elevator"
  | "elevator_space"
  | "accessible_restroom"
  | "restroom_door";

/**
 * Evidence states. `not_visible` and `not_documented` NEVER mean `absent`.
 * `conflicting` is intentionally unresolved until human review.
 */
export type IndicatorState =
  | "present"
  | "absent"
  | "unknown"
  | "not_visible"
  | "not_documented"
  | "conflicting"
  | "not_applicable";

export interface IndicatorEvidence {
  key: IndicatorKey;
  state: IndicatorState;
  /** Short human sentence describing what is supported by the evidence. */
  note: L;
}

export interface EvidenceImage {
  url: string;
  alt: L;
  capturedISO: string;
}

export interface ZoneEvidence {
  key: ZoneKey;
  images: EvidenceImage[];
  /** False when this zone has not been documented at all. */
  documented: boolean;
}

export type VerificationStatus =
  "team_reviewed" | "contributor_only" | "pending_review" | "disputed" | "stale";

export type SourceKind = "contributor_image" | "team_survey";

export interface Facility {
  id: string;
  /** Internal database identifier used only for authenticated mutations. */
  databaseId?: string;
  name: L;
  category: L;
  area: L;
  distanceKm?: number;
  point: { x: number; y: number };
  /** Canonical WGS84 coordinates used by real map and distance features. */
  coordinates?: { latitude: number; longitude: number };
  /** Cover image only; detailed evidence lives inside zones. */
  imageUrl: string;
  imageAlt: L;
  lastVerifiedISO: string;
  verification: VerificationStatus;
  source: SourceKind;
  indicators: Record<IndicatorKey, IndicatorEvidence>;
  zones: Record<ZoneKey, ZoneEvidence>;
}

/** Access needs — never a medical or disability classification. */
export type AccessNeed =
  | "step_free"
  | "ramp_when_raised"
  | "clear_path"
  | "handrail"
  | "parking"
  | "elevator"
  | "accessible_restroom";

export type ContributionStatus = "pending_review" | "approved" | "rejected" | "clarification";

export interface Contribution {
  id: string;
  facilityId: string;
  facilityName: L;
  zone: ZoneKey;
  /** First image is retained for backwards-compatible reviewer cards. */
  imageUrl: string;
  /** All images captured for this single facility zone. Legacy demo records may omit this. */
  imageUrls?: string[];
  submittedISO: string;
  status: ContributionStatus;
  aiObservations: IndicatorEvidence[];
  confirmed: Partial<
    Record<IndicatorKey, { state: IndicatorState; action: "confirmed" | "corrected" | "unsure" }>
  >;
  reviewerNote?: string;
}
