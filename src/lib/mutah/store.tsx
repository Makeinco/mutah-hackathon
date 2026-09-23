import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FACILITIES, INITIAL_CONTRIBUTIONS } from "./data";
import { bi } from "./i18n";
import { persistLiveContribution } from "./operational";
import { supabase } from "./supabase-client";
import { loadReviewedFacilityModels } from "./supabase";
import type {
  AccessNeed,
  Contribution,
  Facility,
  IndicatorEvidence,
  IndicatorKey,
  ZoneKey,
} from "./types";

/**
 * Application state layer. Public demo fixtures remain local, while signed-in
 * contributions created from real browser-selected files are also persisted
 * through the operational Supabase workflow.
 */

interface MutahState {
  facilities: Facility[];
  contributions: Contribution[];
  needs: AccessNeed[];
  needsChosen: boolean;
  setNeeds: (needs: AccessNeed[]) => void;
  skipNeeds: () => void;
  getFacility: (id: string) => Facility | undefined;
  submitContribution: (input: {
    facilityId: string;
    zone: ZoneKey;
    imageUrls: string[];
    aiObservations: IndicatorEvidence[];
    confirmed: Contribution["confirmed"];
  }) => string;
  approveContribution: (id: string, note: string) => void;
  rejectContribution: (id: string, note: string) => void;
  requestClarification: (id: string, note: string) => void;
}

const MutahContext = createContext<MutahState | null>(null);

let seq = 2000;

async function persistSignedInLiveContribution(input: {
  facilityId: string;
  zone: ZoneKey;
  imageUrls: string[];
  aiObservations: IndicatorEvidence[];
  confirmed: Contribution["confirmed"];
}) {
  const liveUrls = input.imageUrls.filter((url) => url.startsWith("blob:"));
  if (liveUrls.length === 0) return;

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  const files = await Promise.all(
    liveUrls.map(async (url, index) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("LOCAL_IMAGE_UNAVAILABLE");
      const blob = await response.blob();
      const type = blob.type || "image/jpeg";
      const extension = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
      return new File([blob], `mutah-evidence-${index + 1}.${extension}`, { type });
    }),
  );

  await persistLiveContribution({
    facilityExternalKey: input.facilityId,
    zone: input.zone,
    focusIndicator: "general",
    userId: user.id,
    files,
    observations: input.aiObservations,
    confirmations: input.confirmed,
  });
}

export function MutahProvider({ children }: { children: ReactNode }) {
  const [facilities, setFacilities] = useState<Facility[]>(FACILITIES);
  const [contributions, setContributions] = useState<Contribution[]>(INITIAL_CONTRIBUTIONS);
  const [needs, setNeedsState] = useState<AccessNeed[]>([]);
  const [needsChosen, setNeedsChosen] = useState(false);

  const refreshReviewedFacilities = useCallback(async () => {
    try {
      const reviewed = await loadReviewedFacilityModels();
      setFacilities((current) => {
        const reviewedIds = new Set(reviewed.map((facility) => facility.id));
        return [...current.filter((facility) => !reviewedIds.has(facility.id)), ...reviewed];
      });
    } catch (error) {
      console.error("Could not refresh reviewed public facilities", error);
    }
  }, []);

  useEffect(() => {
    void refreshReviewedFacilities();
    const refresh = () => void refreshReviewedFacilities();
    window.addEventListener("mutah:reviewed-evidence-changed", refresh);
    return () => window.removeEventListener("mutah:reviewed-evidence-changed", refresh);
  }, [refreshReviewedFacilities]);

  const setNeeds = useCallback((next: AccessNeed[]) => {
    setNeedsState(next);
    setNeedsChosen(true);
  }, []);

  const skipNeeds = useCallback(() => {
    setNeedsState([]);
    setNeedsChosen(true);
  }, []);

  const getFacility = useCallback(
    (id: string) => facilities.find((f) => f.id === id),
    [facilities],
  );

  const submitContribution: MutahState["submitContribution"] = useCallback(
    ({ facilityId, zone, imageUrls, aiObservations, confirmed }) => {
      const id = `c-${++seq}`;
      const facility = facilities.find((f) => f.id === facilityId);
      const cleanUrls = imageUrls.filter(Boolean);
      const imageUrl = cleanUrls[0] ?? "";
      setContributions((prev) => [
        {
          id,
          facilityId,
          facilityName: facility?.name ?? bi("مرفق", "Facility"),
          zone,
          imageUrl,
          imageUrls: cleanUrls,
          submittedISO: new Date().toISOString().slice(0, 10),
          status: "pending_review",
          aiObservations,
          confirmed,
        },
        ...prev,
      ]);
      setFacilities((prev) =>
        prev.map((f) => (f.id === facilityId ? { ...f, verification: "pending_review" } : f)),
      );

      void persistSignedInLiveContribution({
        facilityId,
        zone,
        imageUrls: cleanUrls,
        aiObservations,
        confirmed,
      }).catch((error) => {
        console.error("Operational contribution persistence failed", {
          localContributionId: id,
          message: error instanceof Error ? error.message : "UNKNOWN_ERROR",
        });
      });

      return id;
    },
    [facilities],
  );

  const approveContribution = useCallback((id: string, note: string) => {
    setContributions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "approved", reviewerNote: note } : c)),
    );
    setContributions((current) => {
      const contribution = current.find((c) => c.id === id);
      if (contribution) {
        setFacilities((prev) =>
          prev.map((f) => {
            if (f.id !== contribution.facilityId) return f;
            const next = { ...f.indicators };
            for (const observed of contribution.aiObservations) {
              const key = observed.key as IndicatorKey;
              const confirmed = contribution.confirmed[key];
              if (!confirmed) continue;
              next[key] = {
                key,
                state: confirmed.state,
                note:
                  confirmed.action === "corrected"
                    ? bi(
                        "صححها المساهم بعد مراجعة الأدلة المرئية.",
                        "Corrected by the contributor after reviewing the visual evidence.",
                      )
                    : confirmed.action === "unsure"
                      ? bi(
                          "لم يتمكن المساهم من التأكد من هذا العنصر.",
                          "The contributor could not confirm this item.",
                        )
                      : observed.note,
              };
            }

            const today = new Date().toISOString().slice(0, 10);
            const zone = f.zones[contribution.zone];
            const contributionImages = (
              contribution.imageUrls?.length
                ? contribution.imageUrls
                : contribution.imageUrl
                  ? [contribution.imageUrl]
                  : []
            ).map((url, index) => ({
              url,
              alt: bi(
                `صورة ${index + 1} من مساهمة معتمدة لهذا المسار.`,
                `Photo ${index + 1} from an approved contribution for this zone.`,
              ),
              capturedISO: contribution.submittedISO,
            }));

            const zones = {
              ...f.zones,
              [contribution.zone]: {
                key: contribution.zone,
                documented: contributionImages.length > 0 || zone.documented,
                images: [...contributionImages, ...zone.images],
              },
            } satisfies Facility["zones"];

            return {
              ...f,
              indicators: next,
              zones,
              // Approved access evidence remains inside its zone; it never becomes
              // the facility's official public display image implicitly.
              imageUrl: f.imageUrl,
              lastVerifiedISO: today,
              verification: "team_reviewed",
              source: "contributor_image",
            } satisfies Facility;
          }),
        );
      }
      return current;
    });
  }, []);

  const rejectContribution = useCallback((id: string, note: string) => {
    setContributions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "rejected", reviewerNote: note } : c)),
    );
  }, []);

  const requestClarification = useCallback((id: string, note: string) => {
    setContributions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "clarification", reviewerNote: note } : c)),
    );
  }, []);

  const value = useMemo<MutahState>(
    () => ({
      facilities,
      contributions,
      needs,
      needsChosen,
      setNeeds,
      skipNeeds,
      getFacility,
      submitContribution,
      approveContribution,
      rejectContribution,
      requestClarification,
    }),
    [
      facilities,
      contributions,
      needs,
      needsChosen,
      setNeeds,
      skipNeeds,
      getFacility,
      submitContribution,
      approveContribution,
      rejectContribution,
      requestClarification,
    ],
  );

  return <MutahContext.Provider value={value}>{children}</MutahContext.Provider>;
}

export function useMutah(): MutahState {
  const ctx = useContext(MutahContext);
  if (!ctx) throw new Error("useMutah must be used inside MutahProvider");
  return ctx;
}

export function emptyConfirmations(observations: IndicatorEvidence[]): Contribution["confirmed"] {
  return Object.fromEntries(
    observations.map((o) => [o.key, { state: o.state, action: "confirmed" as const }]),
  ) as Contribution["confirmed"];
}

export type { IndicatorKey };
