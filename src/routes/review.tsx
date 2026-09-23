import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/mutah/AppShell";
import { ReviewCenterLive } from "@/components/mutah/ReviewCenterLive";
import { FacilityProposalQueue } from "@/components/mutah/FacilityProposalQueue";
import { RoleGate } from "@/components/mutah/RoleGate";
import { DisplayImageProposalQueue } from "@/components/mutah/DisplayImageProposalQueue";
import { useLang } from "@/lib/mutah/i18n";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "مركز المراجعة | مُتاح ماب" },
      {
        name: "description",
        content: "واجهة فريق المراجعة: مراجعة حزم الأدلة المرئية واعتمادها أو طلب توضيح قبل النشر.",
      },
      { property: "og:title", content: "مركز المراجعة | مُتاح ماب" },
      { property: "og:description", content: "لا نشر تلقائي: كل مساهمة تمر على مراجع بشري." },
    ],
  }),
  component: ReviewCenter,
});

function ReviewCenter() {
  const { lang, t } = useLang();
  const ar = lang === "ar";

  return (
    <AppShell title={t("navReview")} wide>
      <RoleGate allow={["reviewer", "admin"]}>
        <h1 className="text-2xl font-bold">{t("navReview")}</h1>
        <p className="mt-1 text-muted-foreground">
          {ar
            ? "لا يوجد نشر تلقائي. راجع حزمة الصور ورصد Gemini وتأكيدات المساهم قبل اتخاذ القرار."
            : "There is no automatic publishing. Review the image bundle, Gemini observations, and contributor confirmations before deciding."}
        </p>
        <ReviewCenterLive />
        <FacilityProposalQueue />
        <DisplayImageProposalQueue />
      </RoleGate>
    </AppShell>
  );
}
