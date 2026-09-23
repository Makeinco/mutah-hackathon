import { Check, CircleHelp, ImagePlus, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EvidenceItem } from "@/components/mutah/Evidence";
import { Button } from "@/components/mutah/ui";
import { analyseEvidenceServer } from "@/lib/mutah/ai.functions";
import { useAuth } from "@/lib/mutah/auth";
import { useLang } from "@/lib/mutah/i18n";
import { INDICATOR_LABEL, stateLabel } from "@/lib/mutah/labels";
import { persistClarificationResponse, type PersistedContribution } from "@/lib/mutah/operational";
import { emptyConfirmations } from "@/lib/mutah/store";
import type { Contribution, IndicatorEvidence, IndicatorState, ZoneKey } from "@/lib/mutah/types";

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CORRECTION_OPTIONS: IndicatorState[] = ["present", "absent", "not_visible"];
const DB_TO_ZONE: Record<string, ZoneKey> = {
  approach_path: "approach",
  entrance: "entrance",
  parking: "parking",
  elevator: "elevator",
  accessible_restroom: "restroom",
};

type Step = "capture" | "analysing" | "confirm" | "saving" | "done";

export function ClarificationResponseFlow({
  contribution,
  openFileOnMount = false,
  onComplete,
}: {
  contribution: PersistedContribution;
  openFileOnMount?: boolean;
  onComplete: () => Promise<void> | void;
}) {
  const { lang, pick } = useLang();
  const { session, user } = useAuth();
  const ar = lang === "ar";
  const fileRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<string[]>([]);
  const [step, setStep] = useState<Step>("capture");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [observations, setObservations] = useState<IndicatorEvidence[]>([]);
  const [confirmed, setConfirmed] = useState<Contribution["confirmed"]>({});
  const [reviewedKeys, setReviewedKeys] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (openFileOnMount) fileRef.current?.click();
  }, [openFileOnMount]);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => () => previewsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const addFiles = (selected: FileList | File[]) => {
    const incoming = Array.from(selected);
    if (incoming.some((file) => !ALLOWED_IMAGE_TYPES.has(file.type))) {
      setError(ar ? "استخدم صور JPG أو PNG أو WebP فقط." : "Use JPG, PNG, or WebP images only.");
      return;
    }
    if (incoming.some((file) => file.size > MAX_IMAGE_BYTES)) {
      setError(
        ar
          ? "حجم الصورة الواحدة يجب ألا يتجاوز 8 ميجابايت."
          : "Each image must be 8 MB or smaller.",
      );
      return;
    }
    const accepted = incoming.slice(0, Math.max(0, MAX_IMAGES - files.length));
    if (!accepted.length) return;
    setError("");
    setFiles((current) => [...current, ...accepted].slice(0, MAX_IMAGES));
    setPreviews((current) =>
      [...current, ...accepted.map((file) => URL.createObjectURL(file))].slice(0, MAX_IMAGES),
    );
    setObservations([]);
    setConfirmed({});
    setReviewedKeys(new Set());
    setStep("capture");
  };

  const removeFile = (index: number) => {
    const preview = previews[index];
    if (preview) URL.revokeObjectURL(preview);
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const analyse = async () => {
    const zone = contribution.zone?.zone_type ? DB_TO_ZONE[contribution.zone.zone_type] : undefined;
    if (!zone || files.length === 0 || !user || !session?.access_token) return;
    setStep("analysing");
    setError("");
    try {
      const formData = new FormData();
      formData.set("zone", zone);
      formData.set("accessToken", session.access_token);
      files.forEach((file) => formData.append("images", file));
      const result = await analyseEvidenceServer({ data: formData });
      setObservations(result);
      setConfirmed(emptyConfirmations(result));
      setReviewedKeys(new Set());
      setStep("confirm");
    } catch (cause) {
      console.error("Clarification evidence analysis failed", cause);
      setError(
        ar
          ? "تعذر تحليل الصور عبر Gemini. لم تُرسل أي بيانات؛ حاول مرة أخرى."
          : "Gemini could not analyse these images. Nothing was submitted; try again.",
      );
      setStep("capture");
    }
  };

  const setConfirmation = (
    key: IndicatorEvidence["key"],
    value: NonNullable<Contribution["confirmed"][IndicatorEvidence["key"]]>,
  ) => {
    setConfirmed((current) => ({ ...current, [key]: value }));
    setReviewedKeys((current) => new Set(current).add(key));
  };

  const submit = async () => {
    if (!user || files.length === 0 || reviewedKeys.size !== observations.length) return;
    setStep("saving");
    setError("");
    try {
      await persistClarificationResponse({
        contributionId: contribution.id,
        userId: user.id,
        files,
        contributorNote: note,
        observations,
        confirmations: confirmed,
      });
      setStep("done");
      await onComplete();
    } catch (cause) {
      console.error("Clarification resubmission failed", cause);
      setError(
        ar
          ? "لم يُحفظ التوضيح. لم تتغير حالة المساهمة؛ حاول مرة أخرى."
          : "The clarification was not saved. The contribution status did not change; try again.",
      );
      setStep("confirm");
    }
  };

  if (step === "done") {
    return (
      <div className="mt-4 rounded-xl border border-access/30 bg-access-soft p-4" role="status">
        <p className="font-bold text-access-strong">
          {ar ? "تمت إعادة الإرسال للمراجعة" : "Resubmitted for review"}
        </p>
        <p className="mt-1 text-sm">
          {ar
            ? "أُضيفت الأدلة الجديدة دون تغيير الأدلة الأصلية."
            : "The new evidence was appended without changing the original evidence."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border-2 border-primary/20 bg-primary-soft/30 p-4">
      <h3 className="font-bold">{ar ? "إضافة توضيح" : "Add clarification"}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {ar
          ? "أضف صورًا جديدة. سيرصد Gemini كل عناصر هذه المنطقة، ثم راجع كل ملاحظة قبل إعادة الإرسال."
          : "Add new images. Gemini will observe every indicator for this zone, then you must review every observation before resubmitting."}
      </p>

      <label
        htmlFor={`clarification-note-${contribution.id}`}
        className="mt-4 block text-sm font-semibold"
      >
        {ar ? "ملاحظة توضيحية (اختيارية)" : "Clarification note (optional)"}
      </label>
      <textarea
        id={`clarification-note-${contribution.id}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={2000}
        rows={3}
        disabled={step !== "capture"}
        className="mt-2 w-full rounded-xl border-2 border-input bg-background p-3 text-base"
      />

      <input
        ref={fileRef}
        id={`clarification-files-${contribution.id}`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) addFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      {step === "capture" ? (
        <>
          <Button className="mt-4" variant="outline" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-4" aria-hidden="true" />
            {ar ? "إضافة صورة أخرى" : "Add another image"}
          </Button>
          {previews.length ? (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {previews.map((preview, index) => (
                <li
                  key={preview}
                  className="relative overflow-hidden rounded-xl border border-border"
                >
                  <img
                    src={preview}
                    alt={`${ar ? "صورة توضيح جديدة" : "New clarification image"} ${index + 1}`}
                    className="aspect-4/3 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute end-2 top-2 flex size-11 items-center justify-center rounded-xl bg-background/95"
                    aria-label={`${ar ? "حذف الصورة" : "Remove image"} ${index + 1}`}
                  >
                    <Trash2 className="size-5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <Button
            className="mt-4"
            block
            disabled={files.length === 0}
            onClick={() => void analyse()}
          >
            {ar ? "تحليل الصور الجديدة" : "Analyse new images"}
          </Button>
        </>
      ) : null}

      {step === "analysing" ? (
        <div className="mt-5 flex items-center gap-3" role="status">
          <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
          <p className="font-semibold">
            {ar ? "يجري Gemini تحليل الصور…" : "Gemini is analysing the images…"}
          </p>
        </div>
      ) : null}

      {(step === "confirm" || step === "saving") && observations.length ? (
        <div className="mt-5">
          <h4 className="font-bold">{ar ? "راجع كل ملاحظة" : "Review every observation"}</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {ar ? "AI يرصد، والإنسان يتحقق." : "AI Observes. Humans Verify."}
          </p>
          <ul className="mt-4 space-y-4">
            {observations.map((observation) => {
              const entry = confirmed[observation.key] ?? {
                state: observation.state,
                action: "confirmed" as const,
              };
              return (
                <li key={observation.key} className="rounded-xl border border-border bg-card p-4">
                  <ul>
                    <EvidenceItem evidence={{ ...observation, state: entry.state }} />
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={
                        reviewedKeys.has(observation.key) && entry.action === "confirmed"
                          ? "access"
                          : "outline"
                      }
                      onClick={() => {
                        setConfirmation(observation.key, {
                          state: observation.state,
                          action: "confirmed",
                        });
                        setEditing(null);
                      }}
                    >
                      <Check className="size-4" aria-hidden="true" />
                      {ar ? "أؤكد" : "Confirm"}
                    </Button>
                    <Button
                      size="sm"
                      variant={entry.action === "corrected" ? "primary" : "outline"}
                      onClick={() =>
                        setEditing(editing === observation.key ? null : observation.key)
                      }
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      {ar ? "تصحيح" : "Correct"}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        reviewedKeys.has(observation.key) && entry.action === "unsure"
                          ? "primary"
                          : "outline"
                      }
                      onClick={() => {
                        setConfirmation(observation.key, { state: "unknown", action: "unsure" });
                        setEditing(null);
                      }}
                    >
                      <CircleHelp className="size-4" aria-hidden="true" />
                      {ar ? "غير متأكد" : "Unsure"}
                    </Button>
                  </div>
                  {editing === observation.key ? (
                    <fieldset className="mt-3 rounded-xl border border-border p-3">
                      <legend className="px-1 text-sm font-semibold">
                        {ar ? "ما الذي يظهر؟" : "What is visible?"}{" "}
                        {pick(INDICATOR_LABEL[observation.key])}
                      </legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {CORRECTION_OPTIONS.map((state) => (
                          <label
                            key={state}
                            className="flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold"
                          >
                            <input
                              type="radio"
                              name={`clarification-${contribution.id}-${observation.key}`}
                              checked={
                                reviewedKeys.has(observation.key) &&
                                entry.state === state &&
                                entry.action === "corrected"
                              }
                              onChange={() =>
                                setConfirmation(observation.key, { state, action: "corrected" })
                              }
                            />
                            {pick(stateLabel(observation.key, state))}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <Button
            className="mt-5"
            block
            disabled={step === "saving" || reviewedKeys.size !== observations.length}
            onClick={() => void submit()}
          >
            {step === "saving" ? (
              <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            ) : null}
            {ar ? "إعادة الإرسال للمراجعة" : "Resubmit for review"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {ar
              ? `${reviewedKeys.size} من ${observations.length} تمت مراجعتها`
              : `${reviewedKeys.size} of ${observations.length} reviewed`}
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
