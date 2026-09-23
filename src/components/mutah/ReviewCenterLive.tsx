import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, CircleHelp, LoaderCircle, RefreshCw } from "lucide-react";
import { EvidenceList } from "@/components/mutah/Evidence";
import { Button, Card, EmptyState, SectionTitle, Tag } from "@/components/mutah/ui";
import { FOCUS_LABEL } from "@/lib/mutah/guide-assets";
import { useLang } from "@/lib/mutah/i18n";
import { ZONE_INDICATORS } from "@/lib/mutah/labels";
import {
  listReviewContributions,
  reviewContribution,
  type ReviewContribution,
} from "@/lib/mutah/operational";
import { useMutah } from "@/lib/mutah/store";
import type { ZoneKey } from "@/lib/mutah/types";

const DB_ZONE: Record<string, ZoneKey> = {
  approach_path: "approach",
  entrance: "entrance",
  parking: "parking",
  elevator: "elevator",
  accessible_restroom: "restroom",
};

const STATE_AR: Record<string, string> = {
  present: "ظاهر / موجود",
  absent: "غير ظاهر في الجزء الموثق",
  unknown: "غير مؤكد",
  not_visible: "غير ظاهر في الصور",
  not_applicable: "غير منطبق",
  not_documented: "غير موثق بعد",
  conflicting: "أدلة متعارضة",
};
const STATE_EN: Record<string, string> = {
  present: "Present",
  absent: "Not shown in documented area",
  unknown: "Unknown",
  not_visible: "Not visible in images",
  not_applicable: "Not applicable",
  not_documented: "Not documented yet",
  conflicting: "Conflicting evidence",
};
const ACTION_AR: Record<string, string> = {
  confirmed: "أكّد",
  corrected: "صحّح",
  unsure: "غير متأكد",
};
const ACTION_EN: Record<string, string> = {
  confirmed: "Confirmed",
  corrected: "Corrected",
  unsure: "Unsure",
};
const DECISION_AR: Record<string, string> = {
  approved: "اعتماد",
  rejected: "رفض",
  clarification: "طلب توضيح",
};
const DECISION_EN: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  clarification: "Clarification requested",
};

function dateLabel(value: string | null, locale: "ar" | "en") {
  if (!value) return locale === "ar" ? "غير محدد" : "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "ar" ? "غير محدد" : "Not set";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function EvidenceGallery({ images, ar }: { images: ReviewContribution["images"]; ar: boolean }) {
  if (!images.length)
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        {ar ? "لا توجد صور في هذا القسم." : "No images in this section."}
      </p>
    );
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {images.map((image, index) => (
        <li key={image.id}>
          {image.signed_url ? (
            <img
              src={image.signed_url}
              alt={`${ar ? "دليل مرئي خاص" : "Private visual evidence"} ${index + 1}`}
              className="aspect-4/3 w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex aspect-4/3 items-center justify-center rounded-2xl border border-dashed border-input text-sm text-muted-foreground">
              {ar ? "تعذر إنشاء رابط الصورة" : "Image link unavailable"}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function ObservationCards({
  analyses,
  ar,
}: {
  analyses: ReviewContribution["analyses"];
  ar: boolean;
}) {
  const observations = analyses.flatMap((analysis) => analysis.observations ?? []);
  if (!observations.length)
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        {ar ? "لا توجد ملاحظات AI في هذا القسم." : "No AI observations in this section."}
      </p>
    );
  return (
    <ul className="mt-4 grid gap-3 md:grid-cols-2">
      {observations.map((observation) => {
        const confirmation = observation.confirmations?.[0];
        return (
          <li key={observation.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-bold">{observation.indicator_code}</h4>
              <Tag tone={confirmation?.action === "corrected" ? "brand" : "neutral"}>
                {confirmation
                  ? ar
                    ? ACTION_AR[confirmation.action]
                    : ACTION_EN[confirmation.action]
                  : ar
                    ? "بدون تأكيد"
                    : "No confirmation"}
              </Tag>
            </div>
            <p className="mt-2 text-sm font-semibold">
              {ar
                ? (STATE_AR[observation.ai_state] ?? observation.ai_state)
                : (STATE_EN[observation.ai_state] ?? observation.ai_state)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? observation.explanation_ar
                : observation.explanation_en || observation.explanation_ar}
            </p>
            {confirmation ? (
              <div className="mt-3 border-t border-border pt-3 text-sm">
                <span className="font-semibold">
                  {ar ? "بعد مراجعة المساهم: " : "After contributor review: "}
                </span>
                {ar
                  ? (STATE_AR[confirmation.confirmed_state] ?? confirmation.confirmed_state)
                  : (STATE_EN[confirmation.confirmed_state] ?? confirmation.confirmed_state)}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function ReviewCenterLive() {
  const { lang } = useLang();
  const { getFacility } = useMutah();
  const ar = lang === "ar";
  const [rows, setRows] = useState<ReviewContribution[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await listReviewContributions();
      setRows(next);
      setSelectedId((current) =>
        current && next.some((item) => item.id === current) ? current : (next[0]?.id ?? ""),
      );
    } catch (cause) {
      console.error("Could not load MUTAH review queue", cause);
      setError(
        ar
          ? "تعذر تحميل قائمة المراجعة. حاول مرة أخرى."
          : "Could not load the review queue. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => {
    void load();
  }, [load]);
  const selected = useMemo(
    () => rows.find((item) => item.id === selectedId) ?? rows[0],
    [rows, selectedId],
  );
  const publicFacility = selected?.facility?.external_key
    ? getFacility(selected.facility.external_key)
    : undefined;
  const selectedZone = selected?.zone?.zone_type ? DB_ZONE[selected.zone.zone_type] : undefined;
  const existingEvidence =
    publicFacility && selectedZone
      ? ZONE_INDICATORS[selectedZone].map((key) => publicFacility.indicators[key])
      : [];

  const decide = async (decision: "approved" | "rejected" | "clarification") => {
    if (!selected || busy || selected.status !== "pending_review") return;
    if (decision !== "approved" && note.trim().length < 4) {
      setMessage(
        ar
          ? "اكتب سببًا واضحًا قبل طلب التوضيح أو الرفض."
          : "Write a clear reason before requesting clarification or rejecting.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await reviewContribution({ contributionId: selected.id, decision, note });
      setNote("");
      setMessage(
        decision === "approved"
          ? ar
            ? "تم اعتماد المساهمة ونشر الأدلة المراجعة وتحديث ملف المرفق."
            : "Contribution approved; reviewed evidence was published and the facility profile was refreshed."
          : decision === "clarification"
            ? ar
              ? "تم إرسال طلب التوضيح إلى المساهم."
              : "The clarification request was sent to the contributor."
            : ar
              ? "تم رفض المساهمة ولم تُنشر."
              : "The contribution was rejected and was not published.",
      );
      await load();
    } catch (cause) {
      console.error("MUTAH review decision failed", cause);
      setMessage(
        ar
          ? "لم يُحفظ القرار. لم يتم تغيير المساهمة؛ حاول مرة أخرى."
          : "The decision was not saved. Nothing changed; try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <Card className="mt-6 flex items-center gap-3">
        <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
        <p className="font-semibold">
          {ar ? "جاري تحميل قائمة المراجعة…" : "Loading review queue…"}
        </p>
      </Card>
    );
  if (error)
    return (
      <Card className="mt-6">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 size-5 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-semibold">{error}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => void load()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              {ar ? "إعادة المحاولة" : "Retry"}
            </Button>
          </div>
        </div>
      </Card>
    );
  if (rows.length === 0)
    return (
      <div className="mt-8">
        <EmptyState
          title={ar ? "لا توجد مساهمات بانتظار المراجعة" : "No contributions awaiting review"}
          description={
            ar
              ? "ستظهر هنا المساهمات الحقيقية بعد إرسالها من حسابات المساهمين."
              : "Real contributions will appear here after contributors submit them."
          }
          action={
            <Button size="sm" variant="outline" onClick={() => void load()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              {ar ? "تحديث" : "Refresh"}
            </Button>
          }
        />
      </div>
    );

  const originalImages = selected?.images.filter((image) => image.clarification_round === 0) ?? [];
  const originalAnalyses =
    selected?.analyses.filter((analysis) => analysis.clarification_round === 0) ?? [];
  const clarificationRequests =
    selected?.review_history
      .filter((event) => event.decision === "clarification")
      .sort((a, b) => a.created_at.localeCompare(b.created_at)) ?? [];
  const responses = [...(selected?.clarification_responses ?? [])].sort(
    (a, b) => a.clarification_round - b.clarification_round,
  );
  const history = selected
    ? [
        ...selected.review_history.map((event) => ({
          id: event.id,
          created_at: event.created_at,
          title: ar ? DECISION_AR[event.decision] : DECISION_EN[event.decision],
          note: event.reviewer_note,
        })),
        ...selected.clarification_responses.map((response) => ({
          id: response.id,
          created_at: response.created_at,
          title: ar
            ? `إعادة إرسال التوضيح ${response.clarification_round}`
            : `Clarification ${response.clarification_round} resubmitted`,
          note: response.contributor_note,
        })),
      ].sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];

  return (
    <div className="mt-6">
      <ol
        aria-label={ar ? "تسلسل قرار المراجعة" : "Review decision sequence"}
        className="mb-6 grid gap-2 text-xs font-semibold sm:grid-cols-4 lg:grid-cols-8"
      >
        {(ar
          ? [
              "القائمة",
              "المرفق",
              "المنطقة",
              "الصور",
              "رصد AI",
              "تأكيد المساهم",
              "الحالة الحالية",
              "القرار",
            ]
          : [
              "Queue",
              "Facility",
              "Zone",
              "Images",
              "AI observation",
              "Contributor action",
              "Current state",
              "Decision",
            ]
        ).map((label, index) => (
          <li
            key={label}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              {index + 1}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section
          aria-labelledby="live-review-queue-title"
          className="self-start lg:sticky lg:top-24"
        >
          <div className="flex items-center justify-between gap-2">
            <div id="live-review-queue-title">
              <SectionTitle>{ar ? "قائمة المراجعة" : "Review queue"}</SectionTitle>
            </div>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => void load()}
              aria-label={ar ? "تحديث قائمة المراجعة" : "Refresh review queue"}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <ul className="space-y-2">
            {rows.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setNote("");
                    setMessage("");
                  }}
                  aria-current={selected?.id === item.id ? "true" : undefined}
                  className={`w-full rounded-xl border-2 p-4 text-start transition-colors ${selected?.id === item.id ? "border-primary bg-primary-soft" : "border-border bg-card hover:bg-muted"}`}
                >
                  <span className="block font-bold">
                    {ar ? item.facility?.name_ar : item.facility?.name_en || item.facility?.name_ar}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {ar ? item.zone?.label_ar : item.zone?.label_en || item.zone?.zone_type}
                  </span>
                  {item.focus_indicator && item.focus_indicator !== "general" ? (
                    <span className="mt-1 block text-xs font-semibold text-primary">
                      {ar
                        ? FOCUS_LABEL[item.focus_indicator].ar
                        : FOCUS_LABEL[item.focus_indicator].en}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {dateLabel(item.submitted_at ?? item.created_at, lang)}
                  </span>
                  <span className="mt-2 inline-flex rounded-full bg-muted px-2 py-1 text-xs font-semibold">
                    {item.status === "clarification_requested"
                      ? ar
                        ? "بانتظار توضيح المساهم"
                        : "Awaiting contributor clarification"
                      : ar
                        ? "جاهزة للمراجعة"
                        : "Ready for review"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {selected ? (
          <section className="min-w-0 space-y-6" aria-labelledby="live-review-detail-title">
            <div id="live-review-detail-title">
              <SectionTitle hint={`${ar ? "رقم المساهمة" : "Contribution"} ${selected.id}`}>
                {ar
                  ? selected.facility?.name_ar
                  : selected.facility?.name_en || selected.facility?.name_ar}
              </SectionTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {ar ? selected.zone?.label_ar : selected.zone?.label_en || selected.zone?.zone_type}
              </p>
              {selected.focus_indicator && selected.focus_indicator !== "general" ? (
                <p className="mt-1 text-sm font-semibold text-primary">
                  {ar ? "تركيز المساهم: " : "Contributor focus: "}
                  {ar
                    ? FOCUS_LABEL[selected.focus_indicator].ar
                    : FOCUS_LABEL[selected.focus_indicator].en}
                </p>
              ) : null}
            </div>

            <Card>
              <h3 className="font-bold">{ar ? "المساهمة الأصلية" : "Original submission"}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {ar
                  ? "الأدلة الأصلية محفوظة ولم تُستبدل."
                  : "Original evidence is retained and was not replaced."}
              </p>
              <EvidenceGallery images={originalImages} ar={ar} />
              <h4 className="mt-5 font-bold">
                {ar
                  ? "رصد AI الأصلي وتأكيدات المساهم"
                  : "Original AI observations and confirmations"}
              </h4>
              <ObservationCards analyses={originalAnalyses} ar={ar} />
            </Card>

            <Card className="border-primary/20 bg-primary-soft/25">
              <div className="flex items-start gap-3">
                {existingEvidence.length ? (
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleHelp
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <h3 className="font-bold">
                    {ar ? "الحالة المنشورة حاليًا" : "Current published state"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {existingEvidence.length
                      ? ar
                        ? "قارن المساهمة الجديدة بالأدلة المراجعة الظاهرة حاليًا لهذا المسار."
                        : "Compare the new submission with the reviewed evidence currently shown for this zone."
                      : ar
                        ? "لا توجد حالة منشورة قابلة للمقارنة لهذا المسار؛ لا تفترض غياب العنصر."
                        : "No published state is available for comparison in this zone; do not infer absence."}
                  </p>
                </div>
              </div>
              {existingEvidence.length ? (
                <div className="mt-4">
                  <EvidenceList items={existingEvidence} />
                </div>
              ) : null}
            </Card>

            {clarificationRequests.length ? (
              <Card>
                <h3 className="font-bold">{ar ? "طلبات التوضيح" : "Clarification requests"}</h3>
                <ol className="mt-3 space-y-3">
                  {clarificationRequests.map((request, index) => (
                    <li
                      key={request.id}
                      className="rounded-xl border border-warning/30 bg-unknown-soft p-3"
                    >
                      <p className="text-xs font-semibold text-muted-foreground">
                        {ar ? `الطلب ${index + 1}` : `Request ${index + 1}`} ·{" "}
                        {dateLabel(request.created_at, lang)}
                      </p>
                      <p className="mt-1 text-sm">{request.reviewer_note}</p>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : null}

            {responses.length ? (
              <Card>
                <h3 className="font-bold">
                  {ar ? "ردود المساهم على التوضيح" : "Contributor clarification responses"}
                </h3>
                <ol className="mt-3 space-y-3">
                  {responses.map((response) => (
                    <li key={response.id} className="rounded-xl border border-border p-3">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {ar
                          ? `جولة ${response.clarification_round}`
                          : `Round ${response.clarification_round}`}{" "}
                        · {dateLabel(response.created_at, lang)}
                      </p>
                      <p className="mt-1 text-sm">
                        {response.contributor_note ||
                          (ar ? "لم يضف المساهم ملاحظة نصية." : "No written note was added.")}
                      </p>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : null}

            {responses.map((response) => {
              const roundImages = selected.images.filter(
                (image) => image.clarification_round === response.clarification_round,
              );
              const roundAnalyses = selected.analyses.filter(
                (analysis) => analysis.clarification_round === response.clarification_round,
              );
              return (
                <Card key={`round-${response.clarification_round}`}>
                  <h3 className="font-bold">
                    {ar
                      ? `الأدلة الجديدة — جولة ${response.clarification_round}`
                      : `New evidence — round ${response.clarification_round}`}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ar ? "روابط خاصة ومؤقتة للمراجع." : "Private, temporary reviewer links."}
                  </p>
                  <EvidenceGallery images={roundImages} ar={ar} />
                  <h4 className="mt-5 font-bold">
                    {ar
                      ? "رصد AI الجديد وتأكيدات المساهم"
                      : "New AI observations and contributor confirmations"}
                  </h4>
                  <ObservationCards analyses={roundAnalyses} ar={ar} />
                </Card>
              );
            })}

            <Card>
              <h3 className="font-bold">{ar ? "سجل المراجعة الكامل" : "Full review history"}</h3>
              {history.length ? (
                <ol className="mt-3 space-y-3">
                  {history.map((event) => (
                    <li key={event.id} className="border-s-2 border-primary ps-3">
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {dateLabel(event.created_at, lang)}
                      </p>
                      {event.note ? <p className="mt-1 text-sm">{event.note}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {ar ? "لا توجد قرارات سابقة." : "No previous decisions."}
                </p>
              )}
            </Card>

            {selected.status === "pending_review" ? (
              <Card>
                <label htmlFor="live-review-note" className="block font-bold">
                  {ar ? "سبب القرار" : "Reason for the decision"}
                </label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ar
                    ? "مطلوب للتوضيح أو الرفض، واختياري عند الاعتماد. إذا لم تكفِ الصور، اطلب توضيحًا بدل التخمين."
                    : "Required for clarification or rejection, optional for approval. If evidence is insufficient, request clarification rather than guessing."}
                </p>
                <textarea
                  id="live-review-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="mt-3 w-full rounded-xl border-2 border-input bg-background p-3 text-base"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button disabled={busy} onClick={() => void decide("approved")}>
                    {busy ? (
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    )}
                    {ar ? "اعتماد" : "Approve"}
                  </Button>
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() => void decide("clarification")}
                  >
                    {ar ? "طلب توضيح" : "Request clarification"}
                  </Button>
                  <Button disabled={busy} variant="danger" onClick={() => void decide("rejected")}>
                    {ar ? "رفض" : "Reject"}
                  </Button>
                </div>
                <p aria-live="polite" className="mt-3 text-sm font-semibold">
                  {message}
                </p>
              </Card>
            ) : (
              <Card className="border-warning/30 bg-unknown-soft">
                <p className="font-bold">
                  {ar ? "بانتظار رد المساهم" : "Awaiting contributor response"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ar
                    ? "تُتاح قرارات المراجعة مجددًا بعد إعادة الإرسال."
                    : "Review decisions become available again after resubmission."}
                </p>
              </Card>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
