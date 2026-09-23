import { Archive, Building2, LoaderCircle, RefreshCw, Save, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/mutah/auth";
import { useLang } from "@/lib/mutah/i18n";
import {
  adminSaveFacility,
  adminUploadFacilityDisplayImage,
  adminSetFacilityArchived,
  listFacilityReports,
  listOperationalFacilities,
  resolveFacilityReport,
  type FacilityReport,
  type OperationalFacility,
} from "@/lib/mutah/operational";
import { Button, Card, EmptyState, SectionTitle } from "./ui";
import { LocationPicker } from "./LocationPicker";

const inputClass = "min-h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-sm";
const emptyForm = {
  id: "",
  name_ar: "",
  name_en: "",
  category_ar: "",
  category_en: "",
  area_ar: "",
  area_en: "",
  latitude: "",
  longitude: "",
  reason: "",
};

export function OperationsWorkspace() {
  const { lang } = useLang();
  const { profile } = useAuth();
  const ar = lang === "ar";
  const [facilities, setFacilities] = useState<OperationalFacility[]>([]);
  const [reports, setReports] = useState<FacilityReport[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [freshness, setFreshness] = useState("all");
  const [archive, setArchive] = useState("active");
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [resolution, setResolution] = useState("");
  const [officialImage, setOfficialImage] = useState<File | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    await Promise.all([listOperationalFacilities(), listFacilityReports()])
      .then(([facilityRows, reportRows]) => {
        setFacilities(facilityRows);
        setReports(reportRows);
      })
      .catch(() =>
        setMessage(
          ar
            ? "تعذر تحميل بيانات العمليات. لم تتغير البيانات؛ أعد المحاولة."
            : "Operations data could not be loaded. Nothing changed; try again.",
        ),
      )
      .finally(() => setBusy(false));
  }, [ar]);
  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () =>
      [
        ...new Set(
          facilities
            .map((item) => (ar ? item.category_ar : item.category_en || item.category_ar))
            .filter(Boolean),
        ),
      ] as string[],
    [facilities, ar],
  );
  const filtered = useMemo(
    () =>
      facilities.filter((item) => {
        const haystack =
          `${item.name_ar} ${item.name_en} ${item.area_ar} ${item.area_en}`.toLowerCase();
        const cat = ar ? item.category_ar : item.category_en || item.category_ar;
        const days = item.last_verified_at
          ? (Date.now() - new Date(item.last_verified_at).getTime()) / 86400000
          : Infinity;
        return (
          (!search || haystack.includes(search.toLowerCase())) &&
          (status === "all" || item.verification === status) &&
          (category === "all" || cat === category) &&
          (archive === "all" || (archive === "archived" ? item.is_archived : !item.is_archived)) &&
          (freshness === "all" || (freshness === "fresh" ? days <= 180 : days > 180))
        );
      }),
    [facilities, search, status, category, archive, freshness, ar],
  );

  const edit = (item: OperationalFacility) =>
    setForm({
      id: item.id,
      name_ar: item.name_ar,
      name_en: item.name_en ?? "",
      category_ar: item.category_ar ?? "",
      category_en: item.category_en ?? "",
      area_ar: item.area_ar ?? "",
      area_en: item.area_en ?? "",
      latitude: item.latitude?.toString() ?? "",
      longitude: item.longitude?.toString() ?? "",
      reason: "",
    });
  const save = async () => {
    if (profile?.role !== "admin") return;
    setBusy(true);
    setMessage("");
    try {
      await adminSaveFacility({
        ...(form.id ? { id: form.id } : {}),
        name_ar: form.name_ar,
        name_en: form.name_en || null,
        category_ar: form.category_ar || null,
        category_en: form.category_en || null,
        area_ar: form.area_ar || null,
        area_en: form.area_en || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        reason: form.reason,
      });
      setMessage(ar ? "حُفظ المرفق وسُجل التغيير." : "Facility saved and change audited.");
      setForm(emptyForm);
      setOfficialImage(null);
      await load();
    } catch {
      setMessage(
        ar
          ? "لم يُحفظ المرفق. راجع الحقول وسبب التغيير ثم أعد المحاولة."
          : "The facility was not saved. Review the fields and change reason, then try again.",
      );
      setBusy(false);
    }
  };
  const toggleArchive = async (item: OperationalFacility) => {
    if (profile?.role !== "admin") return;
    const reason = window.prompt(
      ar ? "سبب الأرشفة أو الاستعادة (مطلوب)" : "Archive/unarchive reason (required)",
    );
    if (!reason || reason.trim().length < 4) return;
    setBusy(true);
    try {
      await adminSetFacilityArchived(item.id, !item.is_archived, reason);
      setMessage(
        item.is_archived
          ? ar
            ? "تمت استعادة المرفق وسُجل السبب."
            : "Facility restored and the reason was recorded."
          : ar
            ? "تمت أرشفة المرفق وسُجل السبب."
            : "Facility archived and the reason was recorded.",
      );
      await load();
    } catch {
      setMessage(
        ar
          ? "لم تتغير حالة الأرشفة. تحقق من صلاحيتك ثم أعد المحاولة."
          : "Archive state was unchanged. Check your access and try again.",
      );
      setBusy(false);
    }
  };
  const resolve = async (report: FacilityReport, next: "resolved" | "dismissed") => {
    if (resolution.trim().length < 4) return;
    setBusy(true);
    try {
      await resolveFacilityReport(report.id, next, resolution);
      setResolution("");
      setMessage(
        next === "resolved"
          ? ar
            ? "تم حل البلاغ وتسجيل القرار."
            : "Report resolved and the decision was recorded."
          : ar
            ? "أُغلق البلاغ دون تغيير وسُجل السبب."
            : "Report dismissed without a change and the reason was recorded.",
      );
      await load();
    } catch {
      setMessage(
        ar
          ? "لم يُحفظ قرار البلاغ. لم تتغير البيانات؛ أعد المحاولة."
          : "The report decision was not saved. Nothing changed; try again.",
      );
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 space-y-8">
      <section id="facility-management" aria-labelledby="facility-management-title">
        <div className="flex items-center justify-between gap-3">
          <div id="facility-management-title">
            <SectionTitle>{ar ? "إدارة المرافق" : "Facility management"}</SectionTitle>
          </div>
          <Button
            variant="quiet"
            size="icon"
            aria-label={ar ? "تحديث" : "Refresh"}
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
        <Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              className={inputClass}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={ar ? "بحث" : "Search"}
              aria-label={ar ? "بحث المرافق" : "Search facilities"}
            />
            <select
              className={inputClass}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label={ar ? "حالة التحقق" : "Verification status"}
            >
              <option value="all">{ar ? "كل الحالات" : "All statuses"}</option>
              <option value="team_reviewed">{ar ? "مراجع" : "Reviewed"}</option>
              <option value="stale">{ar ? "قديم" : "Stale"}</option>
            </select>
            <select
              className={inputClass}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label={ar ? "التصنيف" : "Category"}
            >
              <option value="all">{ar ? "كل التصنيفات" : "All categories"}</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              className={inputClass}
              value={freshness}
              onChange={(event) => setFreshness(event.target.value)}
              aria-label={ar ? "حداثة الأدلة" : "Evidence freshness"}
            >
              <option value="all">{ar ? "كل الأعمار" : "All freshness"}</option>
              <option value="fresh">{ar ? "آخر 180 يومًا" : "Within 180 days"}</option>
              <option value="stale">{ar ? "أقدم أو غير موثق" : "Older or unverified"}</option>
            </select>
            <select
              className={inputClass}
              value={archive}
              onChange={(event) => setArchive(event.target.value)}
              aria-label={ar ? "حالة الأرشفة" : "Archive state"}
            >
              <option value="active">{ar ? "نشط" : "Active"}</option>
              <option value="archived">{ar ? "مؤرشف" : "Archived"}</option>
              <option value="all">{ar ? "الكل" : "All"}</option>
            </select>
          </div>
        </Card>
        {busy && !facilities.length ? (
          <Card className="mt-3">
            <LoaderCircle className="size-5 animate-spin" />
          </Card>
        ) : filtered.length ? (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {filtered.map((item) => (
              <li key={item.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">
                        {ar ? item.name_ar : item.name_en || item.name_ar}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ar ? item.category_ar : item.category_en || item.category_ar} ·{" "}
                        {item.verification}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ar ? "آخر تحقق: " : "Last verified: "}
                        {item.last_verified_at
                          ? new Date(item.last_verified_at).toLocaleDateString(ar ? "ar-SA" : "en")
                          : ar
                            ? "لا يوجد"
                            : "none"}
                      </p>
                    </div>
                    {item.is_archived ? (
                      <Archive className="size-5 text-muted-foreground" />
                    ) : (
                      <Building2 className="size-5 text-primary" />
                    )}
                  </div>
                  {profile?.role === "admin" ? (
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => edit(item)}>
                        {ar ? "تعديل" : "Edit"}
                      </Button>
                      <Button size="sm" variant="quiet" onClick={() => void toggleArchive(item)}>
                        {item.is_archived ? (
                          <Undo2 className="size-4" />
                        ) : (
                          <Archive className="size-4" />
                        )}
                        {item.is_archived
                          ? ar
                            ? "استعادة"
                            : "Unarchive"
                          : ar
                            ? "أرشفة"
                            : "Archive"}
                      </Button>
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3">
            <EmptyState
              title={ar ? "لا توجد مرافق تطابق التصفية" : "No facilities match these filters"}
              description={
                ar
                  ? "غيّر البحث أو امسح عوامل التصفية لعرض المرافق المتاحة."
                  : "Change the search or clear the filters to see available facilities."
              }
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatus("all");
                    setCategory("all");
                    setFreshness("all");
                    setArchive("active");
                  }}
                >
                  {ar ? "مسح التصفية" : "Clear filters"}
                </Button>
              }
            />
          </div>
        )}
        {profile?.role === "admin" ? (
          <Card className="mt-4">
            <h3 className="font-bold">
              {form.id
                ? ar
                  ? "تعديل مرفق رسمي"
                  : "Edit official facility"
                : ar
                  ? "إنشاء مرفق رسمي"
                  : "Create official facility"}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["name_ar", ar ? "الاسم بالعربية" : "Arabic name"],
                  ["name_en", ar ? "الاسم بالإنجليزية" : "English name"],
                  ["category_ar", ar ? "التصنيف بالعربية" : "Arabic category"],
                  ["category_en", ar ? "التصنيف بالإنجليزية" : "English category"],
                  ["area_ar", ar ? "المنطقة بالعربية" : "Arabic area"],
                  ["area_en", ar ? "المنطقة بالإنجليزية" : "English area"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-sm font-semibold">
                  {label}
                  <input
                    className={`${inputClass} mt-2`}
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="mt-3">
              <LocationPicker
                latitude={form.latitude ? Number(form.latitude) : null}
                longitude={form.longitude ? Number(form.longitude) : null}
                onChange={(latitude, longitude) =>
                  setForm((current) => ({
                    ...current,
                    latitude: latitude.toFixed(7),
                    longitude: longitude.toFixed(7),
                  }))
                }
              />
            </div>
            <label className="mt-3 block text-sm font-semibold">
              {ar ? "سبب التغيير" : "Change reason"}
              <input
                className={`${inputClass} mt-2`}
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reason: event.target.value }))
                }
              />
            </label>
            {form.id ? (
              <div className="mt-3 rounded-xl border border-border p-3">
                <label className="block text-sm font-semibold">
                  {facilities.find((item) => item.id === form.id)?.official_image_path
                    ? ar
                      ? "تغيير الصورة"
                      : "Change photo"
                    : ar
                      ? "إضافة صورة"
                      : "Add photo"}
                  <input
                    className="mt-2 block w-full font-normal"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setOfficialImage(event.target.files?.[0] ?? null)}
                  />
                </label>
                <Button
                  className="mt-3"
                  variant="outline"
                  disabled={!officialImage || form.reason.trim().length < 4 || busy}
                  onClick={() => {
                    if (!officialImage) return;
                    setBusy(true);
                    void adminUploadFacilityDisplayImage(form.id, officialImage, form.reason)
                      .then(async () => {
                        setOfficialImage(null);
                        setMessage(
                          ar
                            ? "نُشرت الصورة الرسمية وسُجل التغيير."
                            : "Official photo published and audited.",
                        );
                        await load();
                      })
                      .catch(() => {
                        setMessage(
                          ar ? "لم تتغير الصورة الرسمية." : "Official photo was unchanged.",
                        );
                        setBusy(false);
                      });
                  }}
                >
                  {ar ? "نشر الصورة الرسمية" : "Publish official photo"}
                </Button>
              </div>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button
                disabled={
                  busy ||
                  !form.name_ar.trim() ||
                  !form.category_ar.trim() ||
                  form.reason.trim().length < 4
                }
                onClick={() => void save()}
              >
                <Save className="size-4" />
                {ar ? "حفظ" : "Save"}
              </Button>
              {form.id ? (
                <Button variant="outline" onClick={() => setForm(emptyForm)}>
                  {ar ? "إلغاء" : "Cancel"}
                </Button>
              ) : null}
            </div>
          </Card>
        ) : null}
      </section>

      <section id="reports" aria-labelledby="reports-title">
        <div id="reports-title">
          <SectionTitle>{ar ? "بلاغات التغيير" : "Change reports"}</SectionTitle>
        </div>
        {reports.filter((item) => item.status === "open").length ? (
          <ul className="space-y-3">
            {reports
              .filter((item) => item.status === "open")
              .map((report) => (
                <li key={report.id}>
                  <Card>
                    <h3 className="font-bold">
                      {ar
                        ? report.facility?.name_ar
                        : report.facility?.name_en || report.facility?.name_ar}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-primary">{report.report_type}</p>
                    <p className="mt-2 text-sm">{report.details}</p>
                    <label className="mt-3 block text-sm font-semibold">
                      {ar ? "ملاحظة القرار" : "Resolution note"}
                      <input
                        className={`${inputClass} mt-2`}
                        value={resolution}
                        onChange={(event) => setResolution(event.target.value)}
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={resolution.trim().length < 4}
                        onClick={() => void resolve(report, "resolved")}
                      >
                        {ar ? "حل البلاغ" : "Resolve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resolution.trim().length < 4}
                        onClick={() => void resolve(report, "dismissed")}
                      >
                        {ar ? "إغلاق دون تغيير" : "Dismiss"}
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
          </ul>
        ) : (
          <EmptyState
            title={ar ? "لا بلاغات مفتوحة" : "No open reports"}
            description={ar ? "قائمة العمليات محدثة." : "Operations queue is clear."}
          />
        )}
      </section>
      <p aria-live="polite" className="text-sm font-semibold">
        {message}
      </p>
    </div>
  );
}
