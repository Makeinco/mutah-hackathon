import { ImagePlus, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/mutah/auth";
import { useLang } from "@/lib/mutah/i18n";
import {
  listMyFacilityProposals,
  respondToProposalClarification,
  uploadProposalEvidence,
  type FacilityProposal,
} from "@/lib/mutah/operational";
import { Button, Card, EmptyState } from "./ui";

const STATUS: Record<FacilityProposal["status"], { ar: string; en: string }> = {
  draft: { ar: "مسودة", en: "Draft" },
  pending_review: { ar: "قيد المراجعة", en: "Under review" },
  clarification_requested: { ar: "يحتاج توضيحًا", en: "Needs clarification" },
  recommended: { ar: "موصى به للمدير", en: "Recommended to admin" },
  approved: { ar: "معتمد", en: "Approved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
};

export function MyFacilityProposals() {
  const { lang } = useLang();
  const { user } = useAuth();
  const ar = lang === "ar";
  const [rows, setRows] = useState<FacilityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    await listMyFacilityProposals()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);
  if (!user) return null;

  const resubmit = async (proposalId: string) => {
    setActive(proposalId);
    setMessage("");
    try {
      if (file) await uploadProposalEvidence({ proposalId, userId: user.id, file });
      await respondToProposalClarification(proposalId, note);
      setNote("");
      setFile(null);
      setMessage(
        ar
          ? "تم إرسال التوضيح وإعادة المقترح للمراجعة."
          : "Clarification sent and proposal returned to review.",
      );
      await load();
    } catch {
      setMessage(
        ar ? "لم يُرسل التوضيح؛ حاول مرة أخرى." : "Clarification was not sent; try again.",
      );
    } finally {
      setActive("");
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">{ar ? "مقترحات المرافق" : "My facility proposals"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ar
              ? "سجل كامل لحالة مقترحات المرافق."
              : "Complete status history for facility proposals."}
          </p>
        </div>
        <Button
          size="icon"
          variant="quiet"
          aria-label={ar ? "تحديث المقترحات" : "Refresh proposals"}
          onClick={() => void load()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">{ar ? "جاري التحميل…" : "Loading…"}</p>
      ) : rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={ar ? "لا توجد مقترحات" : "No proposals yet"}
            description={
              ar ? "تظهر هنا المقترحات بعد إرسالها." : "Submitted proposals will appear here."
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((proposal) => {
            const latestRequest = [...proposal.events]
              .reverse()
              .find((event) => event.event_type === "clarification_requested");
            return (
              <li key={proposal.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold">
                      {ar
                        ? proposal.proposed_name_ar
                        : proposal.proposed_name_en || proposal.proposed_name_ar}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {proposal.proposal_type === "new_facility"
                        ? ar
                          ? "مرفق جديد"
                          : "New facility"
                        : ar
                          ? "تعديل مرفق"
                          : "Facility change"}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                    {ar ? STATUS[proposal.status].ar : STATUS[proposal.status].en}
                  </span>
                </div>
                {proposal.location_note ? (
                  <p className="mt-2 text-sm">{proposal.location_note}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {proposal.evidence.length} {ar ? "صورة خاصة" : "private image(s)"} ·{" "}
                  {proposal.events.length} {ar ? "حدثًا" : "event(s)"}
                </p>
                {proposal.status === "clarification_requested" ? (
                  <div className="mt-4 rounded-xl bg-caution-soft p-3">
                    <p className="font-semibold">{ar ? "طلب المراجع" : "Reviewer request"}</p>
                    <p className="mt-1 text-sm">{latestRequest?.reason}</p>
                    <label
                      htmlFor={`proposal-note-${proposal.id}`}
                      className="mt-3 block text-sm font-semibold"
                    >
                      {ar ? "ردك (اختياري)" : "Your note (optional)"}
                    </label>
                    <textarea
                      id={`proposal-note-${proposal.id}`}
                      rows={3}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      className="mt-2 w-full rounded-xl border-2 border-input bg-background p-3"
                    />
                    <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-input bg-background px-3 text-sm font-semibold">
                      <ImagePlus className="size-4" />
                      {file
                        ? file.name
                        : ar
                          ? "إضافة صورة توضيح (اختياري)"
                          : "Add clarification image (optional)"}
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                      />
                    </label>
                    <Button
                      className="mt-3"
                      disabled={active === proposal.id}
                      onClick={() => void resubmit(proposal.id)}
                    >
                      {active === proposal.id ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : null}
                      {ar ? "إرسال التوضيح" : "Resubmit clarification"}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <p aria-live="polite" className="mt-3 text-sm font-semibold">
        {message}
      </p>
    </Card>
  );
}
