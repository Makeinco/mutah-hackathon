import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/mutah/AppShell";
import { FacilityProposalFlow } from "@/components/mutah/FacilityProposalFlow";
import { FacilityFinder } from "@/components/mutah/FacilityFinder";
import { Button, Card, SectionTitle } from "@/components/mutah/ui";
import { useLang } from "@/lib/mutah/i18n";
import { ZONE_LABEL, ZONE_ORDER } from "@/lib/mutah/labels";
import { useMutah } from "@/lib/mutah/store";
import type { ZoneKey } from "@/lib/mutah/types";

export const Route = createFileRoute("/contribute/")({
  head: () => ({
    meta: [
      { title: "ساهم | مُتاح ماب" },
      {
        name: "description",
        content: "حدّث صورة مسار أو مدخل أو أبلغ عن تغير، لتصبح معلومات الوصول أوضح وأحدث.",
      },
      { property: "og:title", content: "ساهم | مُتاح ماب" },
      {
        property: "og:description",
        content: "صورة واحدة تساعد الآخرين على معرفة ما ينتظرهم قبل الوصول.",
      },
    ],
  }),
  component: Contribute,
});

function Contribute() {
  const navigate = useNavigate();
  const { facilities } = useMutah();
  const { t, pick, lang } = useLang();
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [zone, setZone] = useState<ZoneKey>("entrance");
  const [showProposal, setShowProposal] = useState(false);

  return (
    <AppShell title={t("contributeTitle")}>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">{t("contributeTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("contributeIntro")}</p>

        <Card className="mt-6 border-2 border-primary/30 bg-primary-soft/40">
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Camera className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold">
                {lang === "ar" ? "حدّث صورة مسار" : "Update a view with a photo"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "ar"
                  ? "أضف صورة حديثة تساعد الآخرين على معرفة ما ينتظرهم قبل الوصول."
                  : "Add a recent photo so others know what to expect before they arrive."}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold">{t("chooseFacility")}</p>
            <FacilityFinder
              facilities={facilities}
              value={facilityId}
              onChange={setFacilityId}
              onMissing={() => setShowProposal(true)}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="zone-select" className="mb-2 block text-sm font-semibold">
              {t("chooseView")}
            </label>
            <select
              id="zone-select"
              value={zone}
              onChange={(e) => setZone(e.target.value as ZoneKey)}
              className="min-h-12 w-full rounded-xl border-2 border-input bg-background px-3 text-base"
            >
              {ZONE_ORDER.map((z) => (
                <option key={z} value={z}>
                  {pick(ZONE_LABEL[z])}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="lg"
            block
            className="mt-4"
            onClick={() =>
              navigate({ to: "/contribute/$facilityId", params: { facilityId }, search: { zone } })
            }
          >
            {t("startContribution")}
          </Button>
        </Card>

        <div className="mt-8" id="facility-proposal">
          <SectionTitle>
            {lang === "ar" ? "المرافق والتغييرات" : "Facilities and changes"}
          </SectionTitle>
          <p className="text-sm text-muted-foreground">
            {lang === "ar"
              ? "المساهم يقترح، فريق مُتاح يراجع، والمدير وحده يعتمد التغيير الرسمي."
              : "Contributors propose, MUTAH reviews, and only an admin approves official changes."}
          </p>
          {showProposal ? (
            <FacilityProposalFlow />
          ) : (
            <Button variant="outline" className="mt-4" onClick={() => setShowProposal(true)}>
              {lang === "ar" ? "فتح نموذج المقترح" : "Open proposal form"}
            </Button>
          )}
        </div>

        <p className="mt-10 text-sm text-muted-foreground">{t("reviewedBeforePublish")}</p>
      </div>
    </AppShell>
  );
}
