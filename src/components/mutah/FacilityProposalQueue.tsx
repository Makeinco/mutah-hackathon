import { CheckCircle2, Image as ImageIcon, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/mutah/auth";
import { useLang } from "@/lib/mutah/i18n";
import {
  approveFacilityProposal,
  listFacilityProposalQueue,
  reviewFacilityProposal,
  type FacilityProposal,
} from "@/lib/mutah/operational";
import { Button, Card, EmptyState, SectionTitle } from "./ui";

export function FacilityProposalQueue() {
  const { lang } = useLang();
  const { profile } = useAuth();
  const ar = lang === "ar";
  const [rows, setRows] = useState<FacilityProposal[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    await listFacilityProposalQueue()
      .then((next) => {
        setRows(next);
        setSelectedId((current) =>
          next.some((row) => row.id === current) ? current : next[0]?.id || "",
        );
      })
      .catch(() => setRows([]))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const selected = rows.find((row) => row.id === selectedId);

  const decide = async (action: "clarification" | "recommend" | "reject") => {
    if (!selected || (action !== "recommend" && reason.trim().length < 4)) return;
    setBusy(true);
    setMessage("");
    try {
      await reviewFacilityProposal({ proposalId: selected.id, action, reason });
      setReason("");
      setMessage(ar ? "تم حفظ قرار المراجعة في السجل." : "Review decision saved to history.");
      await load();
    } catch {
      setMessage(ar ? "لم يُحفظ القرار." : "Decision was not saved.");
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!selected || profile?.role !== "admin") return;
    setBusy(true);
    setMessage("");
    try {
      await approveFacilityProposal(selected.id);
      setMessage(
        ar
          ? "اعتمد المدير المقترح ونُشر التغيير الرسمي."
          : "Admin approved the proposal and published the official change.",
      );
      await load();
    } catch {
      setMessage(
        ar
          ? "لم تتم الموافقة؛ بقيت البيانات الرسمية دون تغيير."
          : "Approval failed; official data was unchanged.",
      );
      setBusy(false);
    }
  };

  return (
    <div id="facility-proposals" className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>{ar ? "مقترحات المرافق" : "Facility proposals"}</SectionTitle>
        <Button
          variant="quiet"
          size="icon"
          aria-label={ar ? "تحديث" : "Refresh"}
          onClick={() => void load()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>
      {busy && !rows.length ? (
        <Card>
          <LoaderCircle className="size-5 animate-spin text-primary" />
        </Card>
      ) : !rows.length ? (
        <EmptyState
          title={ar ? "لا توجد مقترحات نشطة" : "No active proposals"}
          description={ar ? "ستظهر المقترحات الجديدة هنا." : "New proposals will appear here."}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(row.id);
                    setReason("");
                    setMessage("");
                  }}
                  aria-current={row.id === selectedId ? "true" : undefined}
                  className={`w-full rounded-xl border-2 p-4 text-start ${row.id === selectedId ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
                >
                  <span className="block font-bold">
                    {ar ? row.proposed_name_ar : row.proposed_name_en || row.proposed_name_ar}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {row.proposal_type === "new_facility"
                      ? ar
                        ? "مرفق جديد"
                        : "New facility"
                      : ar
                        ? "تعديل مرفق"
                        : "Facility change"}
                  </span>
                  <span className="mt-2 inline-flex rounded-full bg-muted px-2 py-1 text-xs font-semibold">
                    {row.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            <div className="min-w-0 space-y-4">
              <Card>
                <h3 className="text-lg font-bold">
                  {ar
                    ? selected.proposed_name_ar
                    : selected.proposed_name_en || selected.proposed_name_ar}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ar
                    ? selected.proposed_category_ar
                    : selected.proposed_category_en || selected.proposed_category_ar}{" "}
                  ·{" "}
                  {ar
                    ? selected.proposed_area_ar
                    : selected.proposed_area_en || selected.proposed_area_ar}
                </p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold">{ar ? "الإحداثيات" : "Coordinates"}</dt>
                    <dd>
                      {selected.proposed_latitude}, {selected.proposed_longitude}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">{ar ? "الحالة" : "Status"}</dt>
                    <dd>{selected.status}</dd>
                  </div>
                  {selected.existing_facility ? (
                    <div>
                      <dt className="font-semibold">{ar ? "المرفق الحالي" : "Current facility"}</dt>
                      <dd>
                        {ar
                          ? selected.existing_facility.name_ar
                          : selected.existing_facility.name_en ||
                            selected.existing_facility.name_ar}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="font-semibold">{ar ? "فحص التكرار" : "Duplicate review"}</dt>
                    <dd>
                      {selected.duplicate_acknowledged
                        ? selected.duplicate_note
                        : ar
                          ? "لا إقرار بتكرار محتمل"
                          : "No duplicate acknowledgement"}
                    </dd>
                  </div>
                </dl>
                {selected.location_note ? (
                  <p className="mt-4 rounded-xl bg-muted p-3 text-sm">{selected.location_note}</p>
                ) : null}
              </Card>
              <Card>
                <h3 className="font-bold">{ar ? "الأدلة الخاصة" : "Private evidence"}</h3>
                {selected.evidence.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selected.evidence.map((item) =>
                      item.signed_url ? (
                        <img
                          key={item.id}
                          src={item.signed_url}
                          alt={ar ? "دليل خاص للمقترح" : "Private proposal evidence"}
                          className="aspect-square w-full rounded-xl bg-muted object-contain"
                        />
                      ) : (
                        <div
                          key={item.id}
                          className="flex aspect-square items-center justify-center rounded-xl bg-muted"
                        >
                          <ImageIcon />
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {ar ? "لم تُرفق صورة." : "No image attached."}
                  </p>
                )}
              </Card>
              <Card>
                <h3 className="font-bold">{ar ? "سجل المقترح" : "Proposal history"}</h3>
                <ol className="mt-3 space-y-3">
                  {[...selected.events]
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .map((event) => (
                      <li key={event.id} className="border-s-2 border-primary ps-3">
                        <p className="font-semibold">{event.event_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString(ar ? "ar-SA" : "en")}
                        </p>
                        {event.reason ? <p className="mt-1 text-sm">{event.reason}</p> : null}
                      </li>
                    ))}
                </ol>
              </Card>
              {selected.status === "pending_review" ? (
                <Card>
                  <label htmlFor="proposal-review-reason" className="font-bold">
                    {ar ? "سبب القرار" : "Decision reason"}
                  </label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ar
                      ? "مطلوب للتوضيح والرفض. المراجع يوصي ولا ينشر."
                      : "Required for clarification and rejection. Reviewers recommend; they do not publish."}
                  </p>
                  <textarea
                    id="proposal-review-reason"
                    rows={3}
                    className="mt-3 w-full rounded-xl border-2 border-input bg-background p-3"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => void decide("recommend")}>
                      <CheckCircle2 className="size-4" />
                      {ar ? "توصية" : "Recommend"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void decide("clarification")}
                    >
                      {ar ? "طلب توضيح" : "Clarify"}
                    </Button>
                    <Button variant="danger" disabled={busy} onClick={() => void decide("reject")}>
                      {ar ? "رفض" : "Reject"}
                    </Button>
                  </div>
                </Card>
              ) : selected.status === "recommended" ? (
                <Card className="border-primary/30 bg-primary-soft">
                  <p className="font-bold">
                    {ar ? "جاهز لقرار المدير" : "Ready for admin decision"}
                  </p>
                  {profile?.role === "admin" ? (
                    <Button className="mt-3" disabled={busy} onClick={() => void approve()}>
                      {ar ? "اعتماد ونشر التغيير" : "Approve and publish change"}
                    </Button>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {ar
                        ? "لا يمكن للمراجع نشر المرفق الرسمي."
                        : "A reviewer cannot publish an official facility."}
                    </p>
                  )}
                </Card>
              ) : (
                <Card>
                  <p className="font-semibold">
                    {ar ? "بانتظار توضيح المساهم." : "Awaiting contributor clarification."}
                  </p>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      )}
      <p aria-live="polite" className="mt-4 text-sm font-semibold">
        {message}
      </p>
    </div>
  );
}
