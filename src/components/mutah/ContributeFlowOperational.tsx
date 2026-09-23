import { Link, useNavigate } from "@tanstack/react-router";
import {
  Accessibility,
  Camera,
  Check,
  CheckCircle2,
  CircleHelp,
  CircleParking,
  DoorOpen,
  Footprints,
  ImagePlus,
  ImageUp,
  LoaderCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EvidenceItem } from "@/components/mutah/Evidence";
import { AuthCheckpoint } from "@/components/mutah/AuthCheckpoint";
import { Button, Card, EmptyState, SectionTitle } from "@/components/mutah/ui";
import { analyseEvidenceServer } from "@/lib/mutah/ai.functions";
import { ANALYSIS_STEPS, analyseZoneImage } from "@/lib/mutah/ai";
import { useAuth } from "@/lib/mutah/auth";
import { contributionReturnPath } from "@/lib/mutah/auth-navigation";
import {
  ZONE_FOCUS_OPTIONS,
  focusLabel,
  getGuideAsset,
  type FocusIndicator,
  type GuideAsset,
} from "@/lib/mutah/guide-assets";
import { useLang } from "@/lib/mutah/i18n";
import { INDICATOR_LABEL, ZONE_LABEL, ZONE_ORDER, stateLabel } from "@/lib/mutah/labels";
import { persistLiveContribution } from "@/lib/mutah/operational";
import { emptyConfirmations, useMutah } from "@/lib/mutah/store";
import type { Contribution, IndicatorEvidence, IndicatorState, ZoneKey } from "@/lib/mutah/types";

type Step = "capture" | "analysing" | "confirm" | "done";
type AnalysisMode = "live" | "demo" | null;
type SubmitState = "idle" | "saving" | "error";

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const ZONE_ICON = {
  approach: Footprints,
  entrance: DoorOpen,
  parking: CircleParking,
  elevator: Accessibility,
  restroom: Accessibility,
} satisfies Record<ZoneKey, typeof Footprints>;

export function ContributeFlowOperational({
  facilityId,
  initialZone,
  initialFocus,
}: {
  facilityId: string;
  initialZone?: ZoneKey;
  initialFocus?: FocusIndicator;
}) {
  const navigate = useNavigate();
  const { getFacility, submitContribution } = useMutah();
  const { session, user } = useAuth();
  const { t, pick, lang } = useLang();
  const facility = getFacility(facilityId);
  const ar = lang === "ar";

  const [zone, setZone] = useState<ZoneKey>(initialZone ?? "entrance");
  const [focusIndicator, setFocusIndicator] = useState<FocusIndicator>(initialFocus ?? "general");
  const [step, setStep] = useState<Step>("capture");
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [observations, setObservations] = useState<IndicatorEvidence[]>([]);
  const [confirmed, setConfirmed] = useState<Contribution["confirmed"] | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(null);
  const [analysisError, setAnalysisError] = useState(false);
  const [fileError, setFileError] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");
  const [persistedId, setPersistedId] = useState<string | null>(null);
  const [authRecovery, setAuthRecovery] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const returnTo = contributionReturnPath(facilityId, zone, focusIndicator);

  useEffect(
    () => () => previews.forEach((url) => url.startsWith("blob:") && URL.revokeObjectURL(url)),
    [previews],
  );

  useEffect(() => {
    if (user) setAuthRecovery(false);
    else if (selectedFiles.length > 0) setAuthRecovery(true);
  }, [selectedFiles.length, user]);

  if (!facility) {
    return (
      <EmptyState
        title={t("notFound")}
        description={t("notFoundBody")}
        action={
          <Link to="/contribute">
            <Button>{t("goContribute")}</Button>
          </Link>
        }
      />
    );
  }

  const clearImages = () => {
    previews.forEach((url) => url.startsWith("blob:") && URL.revokeObjectURL(url));
    setPreviews([]);
    setSelectedFiles([]);
    setFileError("");
  };

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const invalidType = incoming.some((file) => !ALLOWED_IMAGE_TYPES.has(file.type));
    const tooLarge = incoming.some((file) => file.size > MAX_IMAGE_BYTES);
    if (invalidType || tooLarge) {
      setFileError(
        invalidType
          ? ar
            ? "استخدم صور JPG أو PNG أو WebP فقط."
            : "Use JPG, PNG, or WebP images only."
          : ar
            ? "حجم الصورة الواحدة يجب ألا يتجاوز 8 ميجابايت."
            : "Each image must be 8 MB or smaller.",
      );
      return;
    }
    const accepted = incoming.slice(0, Math.max(0, MAX_IMAGES - selectedFiles.length));
    if (!accepted.length) return;
    setFileError("");
    setSelectedFiles((current) => [...current, ...accepted].slice(0, MAX_IMAGES));
    setPreviews((current) =>
      [...current, ...accepted.map((file) => URL.createObjectURL(file))].slice(0, MAX_IMAGES),
    );
  };

  const removeFile = (index: number) => {
    const url = previews[index];
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    setPreviews((items) => items.filter((_, i) => i !== index));
    setSelectedFiles((items) => items.filter((_, i) => i !== index));
  };

  const startAnalysis = async () => {
    if (!previews.length) return;
    if (selectedFiles.length > 0 && !user) {
      setAuthRecovery(true);
      return;
    }
    setStep("analysing");
    setAnalysisError(false);
    try {
      if (selectedFiles.length > 0) {
        if (!session?.access_token) throw new Error("AUTH_REQUIRED");
        const formData = new FormData();
        formData.set("zone", zone);
        formData.set("accessToken", session.access_token);
        selectedFiles.forEach((file) => formData.append("images", file));
        const result = await analyseEvidenceServer({ data: formData });
        setObservations(result);
        setConfirmed(emptyConfirmations(result));
        setAnalysisMode("live");
      } else {
        const result = analyseZoneImage(facility, zone);
        setObservations(result);
        setConfirmed(emptyConfirmations(result));
        setAnalysisMode("demo");
      }
      setStep("confirm");
    } catch (cause) {
      console.error("Live evidence analysis failed", cause);
      if (cause instanceof Error && cause.message.includes("AUTH_REQUIRED")) {
        setAuthRecovery(true);
        setStep("capture");
        return;
      }
      const fallback = analyseZoneImage(facility, zone);
      setObservations(fallback);
      setConfirmed(emptyConfirmations(fallback));
      setAnalysisMode("demo");
      setAnalysisError(true);
      setStep("confirm");
    }
  };

  const submit = async () => {
    if (!confirmed || submitState === "saving") return;
    setSubmitError("");
    if (analysisMode === "live" && selectedFiles.length > 0) {
      if (!user) {
        setSubmitError(
          ar
            ? "انتهت جلسة الدخول. سجّل الدخول ثم أعد المحاولة؛ لم نعتبر المساهمة مرسلة."
            : "Your session ended. Sign in and try again; the contribution has not been marked as submitted.",
        );
        setAuthRecovery(true);
        return;
      }
      setSubmitState("saving");
      try {
        const id = await persistLiveContribution({
          facilityExternalKey: facility.id,
          zone,
          focusIndicator,
          userId: user.id,
          files: selectedFiles,
          observations,
          confirmations: confirmed,
        });
        setPersistedId(id);
        setSubmitState("idle");
        setStep("done");
      } catch (cause) {
        console.error("Could not persist MUTAH contribution", cause);
        setSubmitState("error");
        setSubmitError(
          ar
            ? "لم تُرسل المساهمة. بقيت الصور والنتائج في هذه الصفحة؛ حاول مرة أخرى."
            : "The contribution was not submitted. Your images and review remain on this page; try again.",
        );
      }
      return;
    }

    submitContribution({
      facilityId: facility.id,
      zone,
      imageUrls: previews,
      aiObservations: observations,
      confirmed,
    });
    setPersistedId(null);
    setSubmitState("idle");
    setStep("done");
  };

  const order: Step[] = ["capture", "analysing", "confirm", "done"];
  const steps: Array<[Step, string]> = [
    ["capture", t("stepPhoto")],
    ["analysing", t("stepAnalysis")],
    ["confirm", t("stepConfirm")],
    ["done", t("stepSend")],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">{pick(facility.name)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {pick(facility.category)} · {pick(facility.area)}
      </p>

      <ol className="mt-5 flex gap-2 text-xs font-semibold" aria-label={t("contributeTitle")}>
        {steps.map(([key, label], index) => (
          <li
            key={key}
            aria-current={step === key ? "step" : undefined}
            className={`flex-1 rounded-full border-2 px-2 py-1 text-center ${order.indexOf(step) >= index ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground"}`}
          >
            {label}
          </li>
        ))}
      </ol>

      {step === "capture" ? (
        <>
          <fieldset className="mt-8">
            <legend className="text-lg font-bold">
              {ar ? "اختر الجزء الذي تظهره الصورة" : "Choose the area shown in the photo"}
            </legend>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? "اختر قسمًا واحدًا لكل حزمة صور. سنوضح ما الذي نحتاج أن يظهر."
                : "Choose one zone per image bundle. We will show what should be visible."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {ZONE_ORDER.map((key) => {
                const Icon = ZONE_ICON[key];
                return (
                  <label
                    key={key}
                    className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-center text-sm font-semibold ${zone === key ? "border-primary bg-primary-soft text-primary" : "border-border bg-card hover:bg-muted"}`}
                  >
                    <input
                      type="radio"
                      name="zone"
                      checked={zone === key}
                      onChange={() => {
                        setZone(key);
                        setFocusIndicator("general");
                        clearImages();
                      }}
                      className="sr-only"
                    />
                    <Icon className="size-6" aria-hidden="true" />
                    <span>{pick(ZONE_LABEL[key])}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {ZONE_FOCUS_OPTIONS[zone].length > 1 ? (
            <fieldset className="mt-6">
              <legend className="text-lg font-bold">
                {ar ? "هل تريد توثيق عنصر محدد؟" : "Do you want to document a specific feature?"}
              </legend>
              <p className="mt-1 text-sm text-muted-foreground">
                {ar
                  ? "هذا الاختيار يغيّر المثال الإرشادي فقط، ولا يحدّ ما قد يظهر في الصور."
                  : "This changes the photo guide only; it does not limit what may be visible in your images."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ZONE_FOCUS_OPTIONS[zone].map((focus) => (
                  <label
                    key={focus}
                    className={`flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-sm font-semibold ${focusIndicator === focus ? "border-primary bg-primary-soft text-primary" : "border-border bg-card hover:bg-muted"}`}
                  >
                    <input
                      type="radio"
                      name="focus-indicator"
                      checked={focusIndicator === focus}
                      onChange={() => setFocusIndicator(focus)}
                      className="sr-only"
                    />
                    {pick(focusLabel(zone, focus))}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <ZoneGuideCard zone={zone} focusIndicator={focusIndicator} />

          <section className="mt-8" aria-labelledby="capture-title">
            <div id="capture-title">
              <SectionTitle hint={t("captureHint")}>{t("captureTitle")}</SectionTitle>
            </div>
            <Card className="bg-surface">
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>
                  {ar
                    ? "التقط أكثر من زاوية إذا لم تكفِ صورة واحدة."
                    : "Use more than one angle when needed."}
                </li>
                <li>{ar ? "تجنب الوجوه ولوحات المركبات." : "Avoid faces and vehicle plates."}</li>
                <li>
                  {ar
                    ? "عدم ظهور العنصر لا يعني أنه غير موجود."
                    : "Not visible does not mean absent."}
                </li>
              </ul>
            </Card>
            {user ? (
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                aria-label={t("pickPhoto")}
                onChange={(event) => {
                  if (event.target.files?.length) addFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            ) : null}
            {fileError ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm font-semibold"
              >
                {fileError}
              </p>
            ) : null}

            {previews.length ? (
              <div className="door-reveal mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    {previews.length} {t("photoCount")}
                  </p>
                  {previews.length < MAX_IMAGES ? (
                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                      <ImagePlus className="size-4" aria-hidden="true" />
                      {t("addAnotherPhoto")}
                    </Button>
                  ) : null}
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {previews.map((preview, index) => (
                    <li
                      key={`${preview}-${index}`}
                      className="relative overflow-hidden rounded-2xl border border-border bg-surface"
                    >
                      <img
                        src={preview}
                        alt={`${t("previewAlt")} ${index + 1}`}
                        className="aspect-4/3 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute end-2 top-2 flex size-11 items-center justify-center rounded-xl bg-background/95 shadow-sm"
                        aria-label={`${t("removePhoto")} ${index + 1}`}
                      >
                        <Trash2 className="size-5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                {selectedFiles.length > 0 && !user ? (
                  <div className="mt-4">
                    <AuthCheckpoint
                      next={returnTo}
                      context="contribution"
                      recovery={authRecovery}
                    />
                  </div>
                ) : (
                  <Button size="lg" block className="mt-4" onClick={() => void startAnalysis()}>
                    {t("continueToAnalysis")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {user ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      size="lg"
                      className="sm:flex-1"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Camera className="size-5" aria-hidden="true" />
                      {t("takePhoto")}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="sm:flex-1"
                      onClick={() => fileRef.current?.click()}
                    >
                      <ImageUp className="size-5" aria-hidden="true" />
                      {t("pickPhoto")}
                    </Button>
                  </div>
                ) : (
                  <AuthCheckpoint next={returnTo} context="contribution" />
                )}
                {facility.imageUrl ? (
                  <Button
                    size="lg"
                    variant="quiet"
                    onClick={() => {
                      clearImages();
                      setPreviews([facility.imageUrl]);
                    }}
                  >
                    {t("useSample")}
                  </Button>
                ) : null}
              </div>
            )}
          </section>
        </>
      ) : null}

      {step === "analysing" ? <AnalysingStep count={previews.length} /> : null}

      {step === "confirm" && confirmed ? (
        <>
          <ConfirmStep
            observations={observations}
            confirmed={confirmed}
            setConfirmed={setConfirmed}
            evidenceCount={previews.length}
            analysisMode={analysisMode}
            analysisError={analysisError}
            submitState={submitState}
            submitError={submitError}
            onTryAgain={() => {
              clearImages();
              setObservations([]);
              setConfirmed(null);
              setAnalysisError(false);
              setSubmitError("");
              setStep("capture");
              window.setTimeout(() => fileRef.current?.click(), 0);
            }}
            onSubmit={() => void submit()}
          />
          {authRecovery && !user ? (
            <div className="mt-4">
              <AuthCheckpoint next={returnTo} context="contribution" recovery />
            </div>
          ) : null}
        </>
      ) : null}

      {step === "done" ? (
        <div className="door-reveal mt-8 rounded-2xl border-2 border-access bg-access-soft p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-access-strong" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold text-access-strong">
            {persistedId
              ? ar
                ? "تم إرسال مساهمتك للمراجعة"
                : "Contribution sent for review"
              : t("thanks")}
          </h2>
          <p className="mt-2 text-sm">
            {persistedId
              ? ar
                ? "حُفظت الصور والرصد وتأكيداتك بأمان، وهي الآن بانتظار المراجعة البشرية."
                : "Your images, observations, and confirmations were saved securely and are awaiting human review."
              : t("thanksBody")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {ar
              ? "لن تغيّر الأدلة حالة المرفق قبل قرار المراجع."
              : "Evidence will not change the facility status before a reviewer decision."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {persistedId ? (
              <Button onClick={() => navigate({ to: "/account" })}>
                {ar ? "متابعة مساهماتي" : "Track my contributions"}
              </Button>
            ) : null}
            <Button
              variant={persistedId ? "outline" : "primary"}
              onClick={() => navigate({ to: "/facility/$id", params: { id: facility.id } })}
            >
              {t("backToFacility")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GuideImage({ asset }: { asset: GuideAsset }) {
  const { pick } = useLang();

  return (
    <div className="flex min-h-36 items-center justify-center bg-primary-soft/55 p-3 sm:min-h-48 sm:p-5">
      <img
        src={asset.image}
        alt={pick(asset.alt)}
        className="guide-art max-h-56 w-full object-contain sm:max-h-64"
      />
    </div>
  );
}

function ZoneGuideCard({
  zone,
  focusIndicator,
}: {
  zone: ZoneKey;
  focusIndicator: FocusIndicator;
}) {
  const { pick, lang } = useLang();
  const guide = getGuideAsset(zone, focusIndicator);
  return (
    <section
      className="door-reveal mutah-surface mutah-open-edge mt-6 overflow-hidden rounded-2xl border border-border bg-surface"
      aria-labelledby="zone-guide-title"
    >
      <div className="grid sm:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.1fr)]">
        <GuideImage asset={guide} />
        <div className="p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            {lang === "ar" ? "مثال إرشادي للصورة" : "Photo guide example"}
          </p>
          <h2 id="zone-guide-title" className="mt-1 text-lg font-bold">
            {pick(guide.title)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{pick(guide.helper)}</p>
          <ul className="mt-4 space-y-2">
            {guide.bullets.map((point) => (
              <li key={pick(point)} className="flex gap-2 text-sm">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-access-strong"
                  aria-hidden="true"
                />
                <span>{pick(point)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function AnalysingStep({ count }: { count: number }) {
  const { t, pick, lang } = useLang();
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setActiveIndex((current) => Math.min(current + 1, ANALYSIS_STEPS.length - 1)),
      900,
    );
    return () => window.clearInterval(timer);
  }, []);
  const progress = Math.max(8, Math.round(((activeIndex + 0.45) / ANALYSIS_STEPS.length) * 100));
  return (
    <section aria-labelledby="analysing-title" className="mt-8" aria-live="polite">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <LoaderCircle className="size-7 animate-spin" aria-hidden="true" />
        </span>
        <div>
          <h2 id="analysing-title" className="text-xl font-bold">
            {t("analysingTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("analysingHint")}</p>
          <p className="mt-2 text-sm font-semibold">
            {lang === "ar"
              ? `تحليل ${count} صورة عبر Gemini…`
              : `Analysing ${count} image${count === 1 ? "" : "s"} with Gemini…`}
          </p>
        </div>
      </div>
      <div className="mt-6">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
          <span>{progress}%</span>
          <span>
            {lang === "ar" ? "قد يستغرق التحليل بضع ثوانٍ." : "Analysis may take a few seconds."}
          </span>
        </div>
      </div>
      <ul className="mt-6 space-y-3">
        {ANALYSIS_STEPS.map((item, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl border p-4 ${active ? "border-primary bg-primary-soft" : "border-border"}`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${done ? "bg-access-soft text-access-strong" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {done ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : active ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <span className="size-2 rounded-full bg-current" />
                )}
              </span>
              <div>
                <span className="font-semibold">{pick(item.label)}</span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {done
                    ? lang === "ar"
                      ? "تم"
                      : "Done"
                    : active
                      ? lang === "ar"
                        ? "قيد التنفيذ"
                        : "In progress"
                      : lang === "ar"
                        ? "التالي"
                        : "Next"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const CORRECTION_OPTIONS: IndicatorState[] = ["present", "absent", "not_visible"];

function ConfirmStep({
  observations,
  confirmed,
  setConfirmed,
  onSubmit,
  onTryAgain,
  evidenceCount,
  analysisMode,
  analysisError,
  submitState,
  submitError,
}: {
  observations: IndicatorEvidence[];
  confirmed: Contribution["confirmed"];
  setConfirmed: (value: Contribution["confirmed"]) => void;
  onSubmit: () => void;
  onTryAgain: () => void;
  evidenceCount: number;
  analysisMode: AnalysisMode;
  analysisError: boolean;
  submitState: SubmitState;
  submitError: string;
}) {
  const { t, pick, lang } = useLang();
  const [editing, setEditing] = useState<string | null>(null);
  const ar = lang === "ar";
  return (
    <section aria-labelledby="results-title" className="mt-8">
      <div id="results-title">
        <SectionTitle hint={t("preliminaryHint")}>{t("preliminary")}</SectionTitle>
      </div>
      <div className="mb-4 rounded-xl border border-border bg-surface p-3 text-sm">
        <p className="font-semibold">
          {analysisMode === "live"
            ? ar
              ? "تحليل حي عبر Gemini — يحتاج تأكيدك قبل الإرسال."
              : "Live Gemini analysis — confirm before submitting."
            : ar
              ? "عرض تجريبي محافظ — لا يدخل بيانات التشغيل."
              : "Conservative demo — it does not enter operational data."}
        </p>
        {analysisError ? (
          <p className="mt-1 text-muted-foreground">
            {ar
              ? "تعذر التحليل الحي؛ استخدمنا العرض التجريبي لهذه المحاولة ولن يُحفظ كدليل حقيقي."
              : "Live analysis failed; this attempt uses demo output and will not be saved as real evidence."}
          </p>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {ar
          ? `ملاحظات أولية مستندة إلى ${evidenceCount} صورة. راجع كل عنصر.`
          : `Preliminary observations based on ${evidenceCount} image${evidenceCount === 1 ? "" : "s"}. Review each item.`}
      </p>
      <ul className="space-y-4">
        {observations.map((observation) => {
          const entry = confirmed[observation.key] ?? {
            state: observation.state,
            action: "confirmed" as const,
          };
          return (
            <li key={observation.key} className="rounded-2xl border border-border p-4">
              <ul>
                <EvidenceItem evidence={{ ...observation, state: entry.state }} />
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={entry.action === "confirmed" ? "access" : "outline"}
                  onClick={() => {
                    setConfirmed({
                      ...confirmed,
                      [observation.key]: { state: observation.state, action: "confirmed" },
                    });
                    setEditing(null);
                  }}
                >
                  <Check className="size-4" aria-hidden="true" />
                  {t("iConfirm")}
                </Button>
                <Button
                  size="sm"
                  variant={entry.action === "corrected" ? "primary" : "outline"}
                  onClick={() => setEditing(editing === observation.key ? null : observation.key)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  {t("iCorrect")}
                </Button>
                <Button
                  size="sm"
                  variant={entry.action === "unsure" ? "primary" : "outline"}
                  onClick={() => {
                    setConfirmed({
                      ...confirmed,
                      [observation.key]: { state: "unknown", action: "unsure" },
                    });
                    setEditing(null);
                  }}
                >
                  <CircleHelp className="size-4" aria-hidden="true" />
                  {t("iAmUnsure")}
                </Button>
              </div>
              {editing === observation.key ? (
                <fieldset className="door-reveal mt-4 rounded-xl border border-border bg-surface p-4">
                  <legend className="px-1 text-sm font-semibold">
                    {t("whatDoYouSee")} {pick(INDICATOR_LABEL[observation.key])}؟
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CORRECTION_OPTIONS.map((state) => (
                      <label
                        key={state}
                        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold ${entry.state === state ? "border-primary bg-primary-soft text-primary" : "border-border"}`}
                      >
                        <input
                          type="radio"
                          name={`fix-${observation.key}`}
                          checked={entry.state === state}
                          onChange={() =>
                            setConfirmed({
                              ...confirmed,
                              [observation.key]: { state, action: "corrected" },
                            })
                          }
                          className="size-4 accent-[var(--color-primary)]"
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
      {submitError ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-semibold"
        >
          {submitError}
        </p>
      ) : null}
      <div className="mt-8">
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <Button
            size="lg"
            variant="outline"
            className="sm:flex-1"
            disabled={submitState === "saving"}
            onClick={onTryAgain}
          >
            {ar ? "إعادة المحاولة" : "Try Again"}
          </Button>
          <Button
            size="lg"
            className="sm:flex-1"
            disabled={submitState === "saving"}
            onClick={onSubmit}
          >
            {submitState === "saving" ? (
              <>
                <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                {ar ? "جاري حفظ مساهمتك…" : "Saving your contribution…"}
              </>
            ) : (
              t("submitForReview")
            )}
          </Button>
        </div>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {submitState === "saving"
            ? ar
              ? "لا تغلق الصفحة حتى يكتمل الحفظ."
              : "Keep this page open until saving completes."
            : t("reviewedBeforePublish")}
        </p>
      </div>
    </section>
  );
}
