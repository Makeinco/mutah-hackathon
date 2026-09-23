import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/mutah/AppShell";
import { ContributeFlowOperational } from "@/components/mutah/ContributeFlowOperational";
import { useLang } from "@/lib/mutah/i18n";

const zoneSchema = z.object({
  zone: z.enum(["approach", "entrance", "parking", "elevator", "restroom"]).optional(),
  focus: z.enum(["general", "ramp", "handrail", "path_obstruction"]).optional(),
});

export const Route = createFileRoute("/contribute/$facilityId")({
  validateSearch: zoneSchema,
  head: () => ({
    meta: [
      { title: "مساهمة بأدلة مرئية | مُتاح ماب" },
      {
        name: "description",
        content:
          "وثّق منطقة واحدة من المرفق بصورة أو أكثر، راجع الرصد الأولي، ثم أرسل الأدلة للمراجعة البشرية.",
      },
      { property: "og:title", content: "مساهمة بأدلة مرئية | مُتاح ماب" },
      { property: "og:description", content: "الذكاء الاصطناعي يرصد، والبشر يتحققون." },
    ],
  }),
  component: ContributionRoute,
});

function ContributionRoute() {
  const { facilityId } = Route.useParams();
  const { zone, focus } = Route.useSearch();
  const { t } = useLang();

  return (
    <AppShell title={t("contributeTitle")}>
      <ContributeFlowOperational
        facilityId={facilityId}
        {...(zone ? { initialZone: zone } : {})}
        {...(focus ? { initialFocus: focus } : {})}
      />
    </AppShell>
  );
}
