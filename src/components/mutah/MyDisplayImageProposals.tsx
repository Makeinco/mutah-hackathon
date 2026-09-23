import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/mutah/auth";
import { useLang } from "@/lib/mutah/i18n";
import {
  listMyDisplayImageProposals,
  respondToDisplayImageClarification,
  type DisplayImageProposal,
} from "@/lib/mutah/operational";
import { Button, Card, SectionTitle } from "./ui";

export function MyDisplayImageProposals() {
  const { user } = useAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [items, setItems] = useState<DisplayImageProposal[]>([]);
  const [context, setContext] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError(false);
    void listMyDisplayImageProposals(user.id)
      .then(setItems)
      .catch(() => {
        setItems([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [user]);
  useEffect(load, [load]);
  return (
    <section id="display-image-proposals" className="scroll-mt-24">
      <SectionTitle>{ar ? "مقترحات صور المرافق" : "Facility photo proposals"}</SectionTitle>
      {loading ? (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {ar ? "جارٍ تحميل مقترحات الصور…" : "Loading photo proposals…"}
        </p>
      ) : error ? (
        <div className="mt-2 rounded-xl border border-caution/30 bg-caution-soft p-3 text-sm">
          <p>{ar ? "تعذر تحميل مقترحات الصور." : "Photo proposals could not be loaded."}</p>
          <Button className="mt-2" size="sm" variant="outline" onClick={load}>
            {ar ? "حاول مرة أخرى" : "Try again"}
          </Button>
        </div>
      ) : !items.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {ar
            ? "لا توجد مقترحات صور في حسابك بعد. اقترح صورة من صفحة أي مرفق."
            : "No photo proposals in your account yet. Suggest one from a facility page."}
        </p>
      ) : null}
      <ul className="mt-3 space-y-3">
        {items.map((item) => {
          const replaced =
            item.status === "approved" &&
            Boolean(item.published_storage_path) &&
            item.facility?.official_image_path !== item.published_storage_path;
          return (
            <li key={item.id}>
              <Card>
                <h3 className="font-bold">
                  {ar ? item.facility?.name_ar : item.facility?.name_en || item.facility?.name_ar}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {replaced
                    ? ar
                      ? "استُبدلت بصورة أحدث"
                      : "Replaced by a newer photo"
                    : item.status === "approved"
                      ? ar
                        ? "معتمدة ومنشورة"
                        : "Approved and published"
                      : item.status === "rejected"
                        ? ar
                          ? "مرفوضة"
                          : "Rejected"
                        : item.status === "clarification_requested"
                          ? ar
                            ? "يحتاج توضيحًا"
                            : "Needs clarification"
                          : item.status === "recommended"
                            ? ar
                              ? "موصى به للمدير"
                              : "Recommended to admin"
                            : ar
                              ? "قيد المراجعة"
                              : "Under review"}
                </p>
                {item.review_reason ? <p className="mt-2 text-sm">{item.review_reason}</p> : null}
                {item.status === "clarification_requested" ? (
                  <>
                    <textarea
                      rows={2}
                      className="mt-3 w-full rounded-xl border-2 border-input p-3 text-sm"
                      value={context}
                      onChange={(event) => setContext(event.target.value)}
                      placeholder={ar ? "أضف التوضيح المطلوب" : "Add the requested clarification"}
                    />
                    <Button
                      className="mt-2"
                      disabled={context.trim().length < 2}
                      onClick={() => {
                        void respondToDisplayImageClarification(item.id, context)
                          .then(() => {
                            setContext("");
                            setMessage(ar ? "أُعيد للمراجعة." : "Returned to review.");
                            load();
                          })
                          .catch(() =>
                            setMessage(
                              ar ? "تعذر إرسال التوضيح." : "Clarification could not be sent.",
                            ),
                          );
                      }}
                    >
                      {ar ? "إرسال التوضيح" : "Send clarification"}
                    </Button>
                  </>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
      {message ? (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      ) : null}
    </section>
  );
}
