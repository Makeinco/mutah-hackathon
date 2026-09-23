import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Languages,
  ImagePlus,
  LockKeyhole,
  LogOut,
  SlidersHorizontal,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/mutah/AppShell";
import { AuthCheckpoint } from "@/components/mutah/AuthCheckpoint";
import { ClarificationResponseFlow } from "@/components/mutah/ClarificationResponseFlow";
import { MyFacilityProposals } from "@/components/mutah/MyFacilityProposals";
import { MyDisplayImageProposals } from "@/components/mutah/MyDisplayImageProposals";
import { Button, Card } from "@/components/mutah/ui";
import { LanguageSwitcher } from "@/components/mutah/LanguageSwitcher";
import { useAuth } from "@/lib/mutah/auth";
import { FOCUS_LABEL } from "@/lib/mutah/guide-assets";
import { useLang } from "@/lib/mutah/i18n";
import { listMyContributions, type PersistedContribution } from "@/lib/mutah/operational";

const accountSearchSchema = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/account")({
  validateSearch: accountSearchSchema,
  component: AccountPage,
});

const STATUS_LABEL: Record<PersistedContribution["status"], { ar: string; en: string }> = {
  draft: { ar: "قيد التجهيز", en: "Draft" },
  processing: { ar: "قيد التجهيز", en: "Processing" },
  awaiting_confirmation: { ar: "بانتظار تأكيدك", en: "Awaiting your confirmation" },
  pending_review: { ar: "قيد المراجعة", en: "Under review" },
  clarification_requested: { ar: "يحتاج توضيحًا", en: "Needs clarification" },
  approved: { ar: "تمت المراجعة", en: "Reviewed" },
  rejected: { ar: "لم تُعتمد", en: "Not approved" },
};

function AccountPage() {
  const { next = "/account" } = Route.useSearch();
  const { lang } = useLang();
  const { ready, user, profile, signOut, canReview } = useAuth();
  const [contributions, setContributions] = useState<PersistedContribution[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [clarifyingId, setClarifyingId] = useState("");
  const [openPicker, setOpenPicker] = useState(false);
  const ar = lang === "ar";

  const loadContributions = useCallback(async () => {
    if (!user) {
      setContributions([]);
      return;
    }
    setLoadingContributions(true);
    await listMyContributions()
      .then(setContributions)
      .catch(() => setContributions([]))
      .finally(() => setLoadingContributions(false));
  }, [user]);

  useEffect(() => {
    void loadContributions();
  }, [loadContributions]);

  return (
    <AppShell title={ar ? "حسابي" : "Account"}>
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{ar ? "حسابي" : "Account"}</h1>
          <p className="mt-2 text-muted-foreground">
            {ar
              ? "استكشف مُتاح دون تسجيل. استخدم الحساب فقط لإرسال مساهمة حقيقية ومتابعتها بين الأجهزة."
              : "Browse MUTAH without signing in. Use an account only to submit and track real contributions across devices."}
          </p>
        </div>

        {!ready ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              {ar ? "جاري التحقق من الحساب…" : "Checking your account…"}
            </p>
          </Card>
        ) : !user ? (
          <AuthCheckpoint next={next} />
        ) : (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <UserRound className="mt-1 size-5 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="font-bold">{profile?.display_name || user.email}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {profile?.role === "admin"
                      ? ar
                        ? "مدير مُتاح"
                        : "MUTAH admin"
                      : profile?.role === "reviewer"
                        ? ar
                          ? "مراجع مُتاح"
                          : "MUTAH reviewer"
                        : ar
                          ? "حساب مساهم"
                          : "Contributor account"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canReview ? (
                  <Link to="/ops">
                    <Button size="sm">{ar ? "مركز العمليات" : "Operations"}</Button>
                  </Link>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => void signOut()}>
                  <LogOut className="size-4" aria-hidden="true" />
                  {ar ? "تسجيل الخروج" : "Sign out"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-start gap-3">
            <SlidersHorizontal className="mt-1 size-5 text-primary" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-bold">{ar ? "احتياجات الوصول" : "Access needs"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {ar
                  ? "عدّل ما تحتاجه لتكون الزيارة أسهل."
                  : "Update what makes a visit easier for you."}
              </p>
              <Link
                to="/preferences"
                className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-input px-4 text-sm font-semibold hover:bg-muted"
              >
                {ar ? "تعديل الاحتياجات" : "Edit access needs"}
              </Link>
            </div>
          </div>
        </Card>

        {user ? <MyFacilityProposals /> : null}
        {user ? <MyDisplayImageProposals /> : null}

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Languages className="mt-1 size-5 text-primary" aria-hidden="true" />
              <div>
                <h2 className="font-bold">{ar ? "اللغة" : "Language"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ar ? "العربية هي اللغة الافتراضية." : "Arabic is the default language."}
                </p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <UploadCloud className="mt-1 size-5 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">{ar ? "مساهماتي" : "My contributions"}</h2>
              {!user ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {ar
                    ? "سجّل الدخول لتتمكن من متابعة مساهماتك وطلبات التوضيح."
                    : "Sign in to track contributions and clarification requests."}
                </p>
              ) : loadingContributions ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {ar ? "جارٍ تحميل مساهماتك…" : "Loading your contributions…"}
                </p>
              ) : contributions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {ar
                    ? "لا توجد مساهمات محفوظة في حسابك بعد."
                    : "No persisted contributions in your account yet."}
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {contributions.map((item) => {
                    const clarificationRequest = [...(item.review_history ?? [])]
                      .filter((event) => event.decision === "clarification")
                      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
                    return (
                      <li key={item.id} className="rounded-xl border border-border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">
                              {ar
                                ? item.facility?.name_ar
                                : item.facility?.name_en || item.facility?.name_ar}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {ar
                                ? item.zone?.label_ar
                                : item.zone?.label_en || item.zone?.label_ar}
                            </p>
                            {item.focus_indicator && item.focus_indicator !== "general" ? (
                              <p className="mt-1 text-xs font-semibold text-primary">
                                {ar
                                  ? FOCUS_LABEL[item.focus_indicator].ar
                                  : FOCUS_LABEL[item.focus_indicator].en}
                              </p>
                            ) : null}
                          </div>
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                            {ar ? STATUS_LABEL[item.status].ar : STATUS_LABEL[item.status].en}
                          </span>
                        </div>
                        {item.status === "clarification_requested" ? (
                          <div className="mt-3 rounded-xl border border-warning/30 bg-unknown-soft p-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                              {ar ? "سبب طلب التوضيح" : "Reviewer clarification reason"}
                            </p>
                            <p className="mt-1 text-sm">
                              {clarificationRequest?.reviewer_note || item.clarification_note}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setOpenPicker(false);
                                  setClarifyingId(item.id);
                                }}
                              >
                                {ar ? "إضافة توضيح" : "Add clarification"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setOpenPicker(true);
                                  setClarifyingId(item.id);
                                }}
                              >
                                <ImagePlus className="size-4" aria-hidden="true" />
                                {ar ? "إضافة صورة أخرى" : "Add another image"}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        {(item.clarification_responses ?? []).some(
                          (response) => response.contributor_note,
                        ) ? (
                          <div className="mt-3 text-sm text-muted-foreground">
                            <p className="font-semibold text-foreground">
                              {ar ? "توضيحاتك السابقة" : "Your previous clarifications"}
                            </p>
                            <ul className="mt-1 list-inside list-disc space-y-1">
                              {(item.clarification_responses ?? [])
                                .filter((response) => response.contributor_note)
                                .map((response) => (
                                  <li key={response.id}>{response.contributor_note}</li>
                                ))}
                            </ul>
                          </div>
                        ) : null}
                        {clarifyingId === item.id && item.status === "clarification_requested" ? (
                          <ClarificationResponseFlow
                            key={`${item.id}-${openPicker ? "picker" : "note"}`}
                            contribution={item}
                            openFileOnMount={openPicker}
                            onComplete={loadContributions}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-1 size-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="font-bold">{ar ? "الخصوصية" : "Privacy"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {ar
                  ? "لا نطلب تشخيصًا طبيًا. تجنّب تصوير الوجوه ولوحات المركبات، وتبقى صور المساهمة الخام خاصة أثناء المراجعة."
                  : "We do not request medical diagnoses. Avoid faces and vehicle plates; raw contribution images remain private during review."}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
