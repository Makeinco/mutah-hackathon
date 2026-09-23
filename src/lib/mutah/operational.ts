import { supabase } from "./supabase-client";
import type { FocusIndicator } from "./guide-assets";
import type { Contribution, IndicatorEvidence, ZoneKey } from "./types";

const ZONE_TO_DB: Record<
  ZoneKey,
  "approach_path" | "entrance" | "parking" | "elevator" | "accessible_restroom"
> = {
  approach: "approach_path",
  entrance: "entrance",
  parking: "parking",
  elevator: "elevator",
  restroom: "accessible_restroom",
};

export type PersistedContribution = {
  id: string;
  status:
    | "draft"
    | "processing"
    | "awaiting_confirmation"
    | "pending_review"
    | "clarification_requested"
    | "approved"
    | "rejected";
  submitted_at: string | null;
  created_at: string;
  clarification_note: string | null;
  focus_indicator: FocusIndicator | null;
  facility: { name_ar: string; name_en: string | null; external_key: string | null } | null;
  zone: { zone_type: string; label_ar: string | null; label_en: string | null } | null;
  clarification_responses: ClarificationResponse[];
  review_history: ReviewDecision[];
};

export type ReviewDecision = {
  id: string;
  decision: "approved" | "rejected" | "clarification";
  reviewer_note: string | null;
  created_at: string;
};

export type ClarificationResponse = {
  id: string;
  clarification_round: number;
  contributor_note: string | null;
  created_at: string;
};

export type ReviewObservation = {
  id: string;
  indicator_code: string;
  ai_state: string;
  explanation_ar: string | null;
  explanation_en: string | null;
  confirmations: Array<{
    id: string;
    confirmed_state: string;
    action: "confirmed" | "corrected" | "unsure";
    note: string | null;
    created_at: string;
  }>;
};

export type ReviewContribution = {
  id: string;
  status: PersistedContribution["status"];
  submitted_by: string;
  submitted_at: string | null;
  created_at: string;
  clarification_note: string | null;
  focus_indicator: FocusIndicator | null;
  facility: {
    name_ar: string;
    name_en: string | null;
    external_key: string | null;
  } | null;
  zone: {
    zone_type: string;
    label_ar: string | null;
    label_en: string | null;
  } | null;
  images: Array<{
    id: string;
    storage_path: string;
    mime_type: string;
    created_at: string;
    clarification_round: number;
    signed_url: string | null;
  }>;
  analyses: Array<{
    id: string;
    provider: string;
    model: string;
    prompt_version: string;
    created_at: string;
    clarification_round: number;
    observations: ReviewObservation[];
  }>;
  clarification_responses: ClarificationResponse[];
  review_history: ReviewDecision[];
};

export type OpsOverview = {
  pending_review: number;
  clarification_requested: number;
  approved: number;
  open_reports: number;
  stale_facilities: number;
  contributors: number;
  proposals_pending: number;
  proposals_clarification: number;
  proposals_recommended: number;
  archived_facilities: number;
  official_facilities: number;
};

export type FacilityProposalStatus =
  "draft" | "pending_review" | "clarification_requested" | "recommended" | "approved" | "rejected";

export type FacilityProposal = {
  id: string;
  proposal_type: "new_facility" | "facility_change";
  status: FacilityProposalStatus;
  submitted_by: string;
  existing_facility_id: string | null;
  approved_facility_id: string | null;
  proposed_name_ar: string;
  proposed_name_en: string | null;
  proposed_category_ar: string;
  proposed_category_en: string | null;
  proposed_area_ar: string | null;
  proposed_area_en: string | null;
  proposed_latitude: number | null;
  proposed_longitude: number | null;
  location_note: string | null;
  duplicate_acknowledged: boolean;
  duplicate_note: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  existing_facility: OperationalFacility | null;
  evidence: ProposalEvidence[];
  events: ProposalEvent[];
};

export type ProposalEvidence = {
  id: string;
  storage_path: string;
  mime_type: string;
  created_at: string;
  signed_url?: string | null;
};

export type ProposalEvent = {
  id: string;
  event_type: string;
  from_status: FacilityProposalStatus | null;
  to_status: FacilityProposalStatus;
  reason: string | null;
  created_at: string;
};

export type OperationalFacility = {
  id: string;
  external_key: string | null;
  name_ar: string;
  name_en: string | null;
  category_ar: string | null;
  category_en: string | null;
  area_ar: string | null;
  area_en: string | null;
  latitude: number | null;
  longitude: number | null;
  verification: string;
  last_verified_at: string | null;
  is_archived: boolean;
  updated_at: string;
  official_image_path: string | null;
};

export type DisplayImageProposal = {
  id: string;
  facility_id: string;
  submitted_by: string;
  private_storage_path: string;
  mime_type: string;
  context_note: string | null;
  status: "pending_review" | "clarification_requested" | "recommended" | "approved" | "rejected";
  review_reason: string | null;
  published_storage_path: string | null;
  created_at: string;
  facility: {
    id: string;
    name_ar: string;
    name_en: string | null;
    official_image_path: string | null;
  } | null;
  signed_url?: string | null;
};

export type FacilityReport = {
  id: string;
  facility_id: string;
  report_type: string;
  details: string | null;
  status: "open" | "resolved" | "dismissed";
  resolution_note: string | null;
  created_at: string;
  facility: Pick<OperationalFacility, "id" | "name_ar" | "name_en"> | null;
};

export type DuplicateFacility = Pick<
  OperationalFacility,
  "id" | "name_ar" | "name_en" | "area_ar" | "area_en"
> & { distance_meters: number };

export async function createContributionDraft(
  facilityExternalKey: string,
  zone: ZoneKey,
  focusIndicator: FocusIndicator,
) {
  const { data, error } = await supabase.rpc("create_contribution_draft", {
    p_external_key: facilityExternalKey,
    p_zone_type: ZONE_TO_DB[zone],
    p_focus_indicator: focusIndicator,
  });
  if (error) throw error;
  return data as string;
}

export async function uploadRawContributionImage({
  contributionId,
  userId,
  file,
  index,
}: {
  contributionId: string;
  userId: string;
  file: File;
  index: number;
}) {
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${userId}/${contributionId}/${String(index + 1).padStart(2, "0")}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("mutah-raw-evidence")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data: imageId, error: attachError } = await supabase.rpc("attach_contribution_image", {
    p_contribution_id: contributionId,
    p_storage_path: storagePath,
    p_mime_type: file.type,
  });
  if (attachError) {
    await supabase.storage.from("mutah-raw-evidence").remove([storagePath]);
    throw attachError;
  }

  return { imageId: imageId as string, storagePath };
}

export async function finalizeContributionForReview({
  contributionId,
  observations,
  confirmations,
}: {
  contributionId: string;
  observations: IndicatorEvidence[];
  confirmations: Contribution["confirmed"];
}) {
  const { error } = await supabase.rpc("finalize_contribution_for_review", {
    p_contribution_id: contributionId,
    p_provider: "google",
    p_model: "gemini-3.6-flash",
    p_prompt_version: "mutah-evidence-v1",
    p_observations: observations,
    p_confirmations: confirmations,
  });
  if (error) throw error;
}

export async function resubmitClarificationForReview({
  contributionId,
  contributorNote,
  observations,
  confirmations,
}: {
  contributionId: string;
  contributorNote?: string;
  observations: IndicatorEvidence[];
  confirmations: Contribution["confirmed"];
}) {
  const { error } = await supabase.rpc("resubmit_contribution_for_review", {
    p_contribution_id: contributionId,
    p_provider: "google",
    p_model: "gemini-3.6-flash",
    p_prompt_version: "mutah-evidence-v1",
    p_observations: observations,
    p_confirmations: confirmations,
    p_contributor_note: contributorNote?.trim() || null,
  });
  if (error) throw error;
}

export async function persistClarificationResponse({
  contributionId,
  userId,
  files,
  contributorNote,
  observations,
  confirmations,
}: {
  contributionId: string;
  userId: string;
  files: File[];
  contributorNote?: string;
  observations: IndicatorEvidence[];
  confirmations: Contribution["confirmed"];
}) {
  if (files.length === 0) throw new Error("CLARIFICATION_IMAGES_REQUIRED");
  for (const [index, file] of files.entries()) {
    await uploadRawContributionImage({ contributionId, userId, file, index });
  }
  await resubmitClarificationForReview({
    contributionId,
    ...(contributorNote === undefined ? {} : { contributorNote }),
    observations,
    confirmations,
  });
}

export async function persistLiveContribution({
  facilityExternalKey,
  zone,
  focusIndicator,
  userId,
  files,
  observations,
  confirmations,
}: {
  facilityExternalKey: string;
  zone: ZoneKey;
  focusIndicator: FocusIndicator;
  userId: string;
  files: File[];
  observations: IndicatorEvidence[];
  confirmations: Contribution["confirmed"];
}) {
  if (files.length === 0) throw new Error("LIVE_IMAGES_REQUIRED");
  const contributionId = await createContributionDraft(facilityExternalKey, zone, focusIndicator);
  for (const [index, file] of files.entries()) {
    await uploadRawContributionImage({ contributionId, userId, file, index });
  }
  await finalizeContributionForReview({ contributionId, observations, confirmations });
  return contributionId;
}

export async function listMyContributions(): Promise<PersistedContribution[]> {
  const { data, error } = await supabase
    .from("contributions")
    .select(
      "id,status,submitted_at,created_at,clarification_note,focus_indicator,facility:facilities(name_ar,name_en,external_key),zone:facility_zones(zone_type,label_ar,label_en),clarification_responses(id,clarification_round,contributor_note:note,created_at),review_history:moderation_decisions(id,decision,reviewer_note,created_at)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PersistedContribution[];
}

export async function listReviewContributions(): Promise<ReviewContribution[]> {
  const { data, error } = await supabase
    .from("contributions")
    .select(
      "id,status,submitted_by,submitted_at,created_at,clarification_note,focus_indicator,facility:facilities(name_ar,name_en,external_key),zone:facility_zones(zone_type,label_ar,label_en),images:contribution_images(id,storage_path,mime_type,created_at,clarification_round),analyses(id,provider,model,prompt_version,created_at,clarification_round,observations(id,indicator_code,ai_state,explanation_ar,explanation_en,confirmations(id,confirmed_state,action,note,created_at))),clarification_responses(id,clarification_round,contributor_note:note,created_at),review_history:moderation_decisions(id,decision,reviewer_note,created_at)",
    )
    .in("status", ["pending_review", "clarification_requested"])
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as ReviewContribution[];
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      images: await Promise.all(
        (row.images ?? []).map(async (image) => {
          const { data: signed } = await supabase.storage
            .from("mutah-raw-evidence")
            .createSignedUrl(image.storage_path, 15 * 60);
          return { ...image, signed_url: signed?.signedUrl ?? null };
        }),
      ),
    })),
  );
}

export async function reviewContribution({
  contributionId,
  decision,
  note,
}: {
  contributionId: string;
  decision: "approved" | "rejected" | "clarification";
  note?: string;
}) {
  const { error } = await supabase.rpc("review_contribution", {
    p_contribution_id: contributionId,
    p_decision: decision,
    p_reviewer_note: note?.trim() || null,
  });
  if (error) throw error;
  if (decision === "approved" && typeof window !== "undefined") {
    window.dispatchEvent(new Event("mutah:reviewed-evidence-changed"));
  }
}

export async function getOpsOverview(): Promise<OpsOverview> {
  const { data, error } = await supabase.rpc("get_mutah_ops_overview");
  if (error) throw error;
  const row = (data ?? {}) as Partial<OpsOverview>;
  return {
    pending_review: Number(row.pending_review ?? 0),
    clarification_requested: Number(row.clarification_requested ?? 0),
    approved: Number(row.approved ?? 0),
    open_reports: Number(row.open_reports ?? 0),
    stale_facilities: Number(row.stale_facilities ?? 0),
    contributors: Number(row.contributors ?? 0),
    proposals_pending: Number(row.proposals_pending ?? 0),
    proposals_clarification: Number(row.proposals_clarification ?? 0),
    proposals_recommended: Number(row.proposals_recommended ?? 0),
    archived_facilities: Number(row.archived_facilities ?? 0),
    official_facilities: Number(row.official_facilities ?? 0),
  };
}

const PROPOSAL_SELECT =
  "id,proposal_type,status,submitted_by,existing_facility_id,approved_facility_id,proposed_name_ar,proposed_name_en,proposed_category_ar,proposed_category_en,proposed_area_ar,proposed_area_en,proposed_latitude,proposed_longitude,location_note,duplicate_acknowledged,duplicate_note,submitted_at,created_at,updated_at,existing_facility:facilities!existing_facility_id(id,name_ar,name_en),evidence:facility_proposal_evidence(id,storage_path,mime_type,created_at),events:facility_proposal_events(id,event_type,from_status,to_status,reason,created_at)";

async function addProposalSignedUrls(rows: FacilityProposal[]) {
  return Promise.all(
    rows.map(async (proposal) => ({
      ...proposal,
      evidence: await Promise.all(
        (proposal.evidence ?? []).map(async (item) => {
          const { data } = await supabase.storage
            .from("mutah-raw-evidence")
            .createSignedUrl(item.storage_path, 15 * 60);
          return { ...item, signed_url: data?.signedUrl ?? null };
        }),
      ),
    })),
  );
}

export async function listMyFacilityProposals() {
  const { data, error } = await supabase
    .from("facility_proposals")
    .select(PROPOSAL_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return addProposalSignedUrls((data ?? []) as unknown as FacilityProposal[]);
}

export async function listFacilityProposalQueue() {
  const { data, error } = await supabase
    .from("facility_proposals")
    .select(PROPOSAL_SELECT)
    .in("status", ["pending_review", "clarification_requested", "recommended"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return addProposalSignedUrls((data ?? []) as unknown as FacilityProposal[]);
}

export async function findFacilityDuplicates(input: {
  name: string;
  latitude: number;
  longitude: number;
}) {
  const { data, error } = await supabase.rpc("find_facility_proposal_duplicates", {
    p_name: input.name,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_radius_meters: 250,
  });
  if (error) throw error;
  return (data ?? []) as DuplicateFacility[];
}

export async function createFacilityProposal(input: {
  proposalType: "new_facility" | "facility_change";
  existingFacilityId?: string;
  nameAr: string;
  nameEn?: string;
  categoryAr: string;
  categoryEn?: string;
  areaAr?: string;
  areaEn?: string;
  latitude: number;
  longitude: number;
  locationNote?: string;
  duplicateAcknowledged?: boolean;
  duplicateNote?: string;
}) {
  const { data, error } = await supabase.rpc("create_facility_proposal", {
    p_proposal_type: input.proposalType,
    p_existing_facility_id: input.existingFacilityId ?? null,
    p_name_ar: input.nameAr,
    p_name_en: input.nameEn?.trim() || null,
    p_category_ar: input.categoryAr,
    p_category_en: input.categoryEn?.trim() || null,
    p_area_ar: input.areaAr?.trim() || null,
    p_area_en: input.areaEn?.trim() || null,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_location_note: input.locationNote?.trim() || null,
    p_duplicate_acknowledged: input.duplicateAcknowledged ?? false,
    p_duplicate_note: input.duplicateNote?.trim() || null,
    p_submit: true,
  });
  if (error) throw error;
  return data as string;
}

export async function uploadProposalEvidence(input: {
  proposalId: string;
  userId: string;
  file: File;
}) {
  const extension =
    input.file.type === "image/png" ? "png" : input.file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${input.userId}/proposals/${input.proposalId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("mutah-raw-evidence")
    .upload(storagePath, input.file, { contentType: input.file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { error } = await supabase.rpc("attach_facility_proposal_evidence", {
    p_proposal_id: input.proposalId,
    p_storage_path: storagePath,
    p_mime_type: input.file.type,
  });
  if (error) {
    await supabase.storage.from("mutah-raw-evidence").remove([storagePath]);
    throw error;
  }
}

export async function respondToProposalClarification(proposalId: string, note?: string) {
  const { error } = await supabase.rpc("respond_to_facility_proposal_clarification", {
    p_proposal_id: proposalId,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
}

export async function reviewFacilityProposal(input: {
  proposalId: string;
  action: "clarification" | "recommend" | "reject";
  reason?: string;
}) {
  const { error } = await supabase.rpc("review_facility_proposal", {
    p_proposal_id: input.proposalId,
    p_action: input.action,
    p_reason: input.reason?.trim() || null,
  });
  if (error) throw error;
}

export async function approveFacilityProposal(proposalId: string) {
  const { data, error } = await supabase.rpc("approve_facility_proposal", {
    p_proposal_id: proposalId,
  });
  if (error) throw error;
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("mutah:reviewed-evidence-changed"));
  return data as string;
}

export async function listOperationalFacilities() {
  const { data, error } = await supabase
    .from("facilities")
    .select(
      "id,external_key,name_ar,name_en,category_ar,category_en,area_ar,area_en,latitude,longitude,verification,last_verified_at,is_archived,updated_at,official_image_path",
    )
    .eq("is_demo", false)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OperationalFacility[];
}

export type DisplayImageFlowErrorCode =
  | "session_expired"
  | "permission_denied"
  | "facility_unavailable"
  | "pending_proposal"
  | "upload_failed"
  | "proposal_creation_failed"
  | "network_unavailable";

export class DisplayImageFlowError extends Error {
  readonly code: DisplayImageFlowErrorCode;

  constructor(code: DisplayImageFlowErrorCode, options?: { cause?: unknown }) {
    super(code, options);
    this.name = "DisplayImageFlowError";
    this.code = code;
  }
}

function errorDetails(error: unknown) {
  if (!error || typeof error !== "object") return {};
  const value = error as Record<string, unknown>;
  return {
    message: typeof value["message"] === "string" ? value["message"] : "",
    code: typeof value["code"] === "string" ? value["code"] : "",
    status:
      typeof value["status"] === "number"
        ? value["status"]
        : typeof value["statusCode"] === "string"
          ? Number(value["statusCode"])
          : undefined,
  };
}

function classifyDisplayImageError(
  error: unknown,
  fallback: DisplayImageFlowErrorCode,
): DisplayImageFlowError {
  if (error instanceof DisplayImageFlowError) return error;
  const details = errorDetails(error);
  const searchable = `${details.code} ${details.message}`.toLowerCase();
  const code =
    searchable.includes("display_image_proposal_pending") ||
    searchable.includes("duplicate") ||
    details.code === "23505"
      ? "pending_proposal"
      : details.status === 401 || searchable.includes("jwt")
        ? "session_expired"
        : details.status === 403 ||
            searchable.includes("permission") ||
            searchable.includes("policy")
          ? "permission_denied"
          : searchable.includes("facility_not_found")
            ? "facility_unavailable"
            : searchable.includes("fetch") || searchable.includes("network")
              ? "network_unavailable"
              : fallback;
  return new DisplayImageFlowError(code, { cause: error });
}

function logDisplayImageDiagnostic(stage: string, error: unknown) {
  if (!import.meta.env.DEV) return;
  const details = errorDetails(error);
  console.error("[MUTAH display image]", {
    stage,
    code: details.code,
    status: details.status,
    message: details.message,
  });
}

const ACTIVE_DISPLAY_IMAGE_STATUSES = [
  "pending_review",
  "clarification_requested",
  "recommended",
] as const;

export async function getMyActiveDisplayImageProposal(facilityId: string, userId: string) {
  const { data, error } = await supabase
    .from("facility_display_image_proposals")
    .select(
      "id,facility_id,submitted_by,private_storage_path,mime_type,context_note,status,review_reason,published_storage_path,created_at,facility:facilities(id,name_ar,name_en,official_image_path)",
    )
    .eq("facility_id", facilityId)
    .eq("submitted_by", userId)
    .in("status", [...ACTIVE_DISPLAY_IMAGE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw classifyDisplayImageError(error, "proposal_creation_failed");
  return data as unknown as DisplayImageProposal | null;
}

export async function proposeFacilityDisplayImage(input: {
  facilityId: string;
  userId: string;
  file: File;
  context?: string;
}) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== input.userId) {
    logDisplayImageDiagnostic("auth", authError);
    throw new DisplayImageFlowError("session_expired", { cause: authError });
  }

  const { data: facility, error: facilityError } = await supabase
    .from("facilities")
    .select("id,is_archived,is_demo")
    .eq("id", input.facilityId)
    .maybeSingle();
  if (facilityError) {
    logDisplayImageDiagnostic("facility", facilityError);
    throw classifyDisplayImageError(facilityError, "facility_unavailable");
  }
  if (!facility || facility.is_archived || facility.is_demo) {
    throw new DisplayImageFlowError("facility_unavailable");
  }

  const activeProposal = await getMyActiveDisplayImageProposal(input.facilityId, input.userId);
  if (activeProposal) throw new DisplayImageFlowError("pending_proposal");

  const extension =
    input.file.type === "image/png" ? "png" : input.file.type === "image/webp" ? "webp" : "jpg";
  const path = `${input.userId}/display-images/${input.facilityId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("mutah-raw-evidence")
    .upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (uploadError) {
    logDisplayImageDiagnostic("private-upload", uploadError);
    throw classifyDisplayImageError(uploadError, "upload_failed");
  }
  const { data, error } = await supabase.rpc("create_facility_display_image_proposal", {
    p_facility_id: input.facilityId,
    p_storage_path: path,
    p_mime_type: input.file.type,
    p_context_note: input.context?.trim() || null,
  });
  if (error) {
    logDisplayImageDiagnostic("proposal-create", error);
    const { error: cleanupError } = await supabase.storage
      .from("mutah-raw-evidence")
      .remove([path]);
    if (cleanupError) logDisplayImageDiagnostic("private-orphan-cleanup", cleanupError);
    throw classifyDisplayImageError(error, "proposal_creation_failed");
  }
  return data as string;
}

export async function listDisplayImageProposals(activeOnly = false) {
  let query = supabase
    .from("facility_display_image_proposals")
    .select(
      "id,facility_id,submitted_by,private_storage_path,mime_type,context_note,status,review_reason,published_storage_path,created_at,facility:facilities(id,name_ar,name_en,official_image_path)",
    );
  if (activeOnly)
    query = query.in("status", ["pending_review", "clarification_requested", "recommended"]);
  const { data, error } = await query.order("created_at", { ascending: activeOnly });
  if (error) throw error;
  return Promise.all(
    ((data ?? []) as unknown as DisplayImageProposal[]).map(async (proposal) => {
      const { data: signed } = await supabase.storage
        .from("mutah-raw-evidence")
        .createSignedUrl(proposal.private_storage_path, 900);
      return { ...proposal, signed_url: signed?.signedUrl ?? null };
    }),
  );
}

export async function listMyDisplayImageProposals(userId: string) {
  const { data, error } = await supabase
    .from("facility_display_image_proposals")
    .select(
      "id,facility_id,submitted_by,private_storage_path,mime_type,context_note,status,review_reason,published_storage_path,created_at,facility:facilities(id,name_ar,name_en,official_image_path)",
    )
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DisplayImageProposal[];
}

export async function reviewDisplayImageProposal(
  id: string,
  action: "clarification" | "recommend" | "reject",
  reason?: string,
) {
  const { error } = await supabase.rpc("review_facility_display_image_proposal", {
    p_proposal_id: id,
    p_action: action,
    p_reason: reason?.trim() || null,
  });
  if (error) throw error;
}

export async function respondToDisplayImageClarification(id: string, context: string) {
  const { error } = await supabase.rpc("respond_to_display_image_clarification", {
    p_proposal_id: id,
    p_context_note: context,
  });
  if (error) throw error;
}

async function uploadPublicFacilityImage(facilityId: string, file: Blob, mimeType: string) {
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${facilityId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("mutah-public-facility-media")
    .upload(path, file, { contentType: mimeType, upsert: false });
  if (error) {
    logDisplayImageDiagnostic("public-upload", error);
    throw classifyDisplayImageError(error, "upload_failed");
  }
  return path;
}

async function removePublicFacilityImage(path: string) {
  const { error } = await supabase.storage.from("mutah-public-facility-media").remove([path]);
  if (error) logDisplayImageDiagnostic("public-orphan-cleanup", error);
}

export async function publishDisplayImageProposal(proposal: DisplayImageProposal, reason?: string) {
  if (!proposal.signed_url) throw new Error("PRIVATE_IMAGE_UNAVAILABLE");
  const response = await fetch(proposal.signed_url);
  if (!response.ok) throw new Error("PRIVATE_IMAGE_UNAVAILABLE");
  const path = await uploadPublicFacilityImage(
    proposal.facility_id,
    await response.blob(),
    proposal.mime_type,
  );
  const { error } = await supabase.rpc("publish_facility_display_image", {
    p_proposal_id: proposal.id,
    p_public_path: path,
    p_reason: reason?.trim() || null,
  });
  if (error) {
    await removePublicFacilityImage(path);
    throw error;
  }
  window.dispatchEvent(new Event("mutah:reviewed-evidence-changed"));
}

export async function adminUploadFacilityDisplayImage(
  facilityId: string,
  file: File,
  reason: string,
) {
  const path = await uploadPublicFacilityImage(facilityId, file, file.type);
  const { error } = await supabase.rpc("admin_set_facility_display_image", {
    p_facility_id: facilityId,
    p_public_path: path,
    p_reason: reason,
  });
  if (error) {
    await removePublicFacilityImage(path);
    throw error;
  }
  window.dispatchEvent(new Event("mutah:reviewed-evidence-changed"));
}

export async function adminSaveFacility(
  input: Omit<
    OperationalFacility,
    | "id"
    | "external_key"
    | "verification"
    | "last_verified_at"
    | "is_archived"
    | "updated_at"
    | "official_image_path"
  > & { id?: string; reason?: string },
) {
  const { data, error } = await supabase.rpc("admin_save_facility", {
    p_facility_id: input.id ?? null,
    p_name_ar: input.name_ar,
    p_name_en: input.name_en,
    p_category_ar: input.category_ar,
    p_category_en: input.category_en,
    p_area_ar: input.area_ar,
    p_area_en: input.area_en,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_reason: input.reason?.trim() || null,
  });
  if (error) throw error;
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("mutah:reviewed-evidence-changed"));
  return data as string;
}

export async function adminSetFacilityArchived(id: string, archived: boolean, reason: string) {
  const { error } = await supabase.rpc("admin_set_facility_archived", {
    p_facility_id: id,
    p_archived: archived,
    p_reason: reason,
  });
  if (error) throw error;
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("mutah:reviewed-evidence-changed"));
}

export async function createFacilityReport(
  facilityId: string,
  reportType: string,
  details: string,
) {
  const { data, error } = await supabase.rpc("create_facility_report", {
    p_facility_id: facilityId,
    p_report_type: reportType,
    p_details: details,
  });
  if (error) throw error;
  return data as string;
}

export async function listFacilityReports() {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id,facility_id,report_type,details,status,resolution_note,created_at,facility:facilities(id,name_ar,name_en)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FacilityReport[];
}

export async function resolveFacilityReport(
  id: string,
  status: "resolved" | "dismissed",
  note: string,
) {
  const { error } = await supabase.rpc("resolve_facility_report", {
    p_report_id: id,
    p_status: status,
    p_resolution_note: note,
  });
  if (error) throw error;
}
