import { Link } from "@tanstack/react-router";
import { Building2, Flag, ImagePlus, LoaderCircle, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/mutah/auth";
import { useLang } from "@/lib/mutah/i18n";
import {
  createFacilityProposal,
  createFacilityReport,
  findFacilityDuplicates,
  listOperationalFacilities,
  uploadProposalEvidence,
  type DuplicateFacility,
  type OperationalFacility,
} from "@/lib/mutah/operational";
import { Button, Card } from "./ui";
import { LocationPicker } from "./LocationPicker";

type Mode = "new_facility" | "facility_change" | "report";

const fieldClass = "min-h-12 w-full rounded-xl border-2 border-input bg-background px-3 text-base";

export function FacilityProposalFlow() {
  const { lang } = useLang();
  const { user } = useAuth();
  const ar = lang === "ar";
  const [mode, setMode] = useState<Mode>("new_facility");
  const [facilities, setFacilities] = useState<OperationalFacility[]>([]);
  const [facilityId, setFacilityId] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [categoryAr, setCategoryAr] = useState("");
  const [categoryEn, setCategoryEn] = useState("");
  const [areaAr, setAreaAr] = useState("");
  const [areaEn, setAreaEn] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateFacility[]>([]);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [duplicateNote, setDuplicateNote] = useState("");
  const [reportType, setReportType] = useState("outdated_information");
  const [reportDetails, setReportDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void listOperationalFacilities()
      .then((rows) => {
        setFacilities(rows.filter((row) => !row.is_archived));
        setFacilityId((current) => current || rows[0]?.id || "");
      })
      .catch(() => setFacilities([]));
  }, []);

  const selectFacility = (id: string) => {
    setFacilityId(id);
    const facility = facilities.find((item) => item.id === id);
    if (!facility || mode !== "facility_change") return;
    setNameAr(facility.name_ar);
    setNameEn(facility.name_en ?? "");
    setCategoryAr(facility.category_ar ?? "");
    setCategoryEn(facility.category_en ?? "");
    setAreaAr(facility.area_ar ?? "");
    setAreaEn(facility.area_en ?? "");
    setLatitude(facility.latitude?.toString() ?? "");
    setLongitude(facility.longitude?.toString() ?? "");
  };

  const chooseMode = (next: Mode) => {
    setMode(next);
    setMessage("");
    setDuplicates([]);
    setDuplicateAcknowledged(false);
    if (next === "facility_change" && facilityId) {
      const facility = facilities.find((item) => item.id === facilityId);
      if (facility) {
        setNameAr(facility.name_ar);
        setNameEn(facility.name_en ?? "");
        setCategoryAr(facility.category_ar ?? "");
        setCategoryEn(facility.category_en ?? "");
        setAreaAr(facility.area_ar ?? "");
        setAreaEn(facility.area_en ?? "");
        setLatitude(facility.latitude?.toString() ?? "");
        setLongitude(facility.longitude?.toString() ?? "");
      }
    }
  };

  const chooseExistingFacility = (id: string) => {
    const facility = facilities.find((item) => item.id === id);
    if (!facility) return;
    setMode("facility_change");
    setFacilityId(id);
    setNameAr(facility.name_ar);
    setNameEn(facility.name_en ?? "");
    setCategoryAr(facility.category_ar ?? "");
    setCategoryEn(facility.category_en ?? "");
    setAreaAr(facility.area_ar ?? "");
    setAreaEn(facility.area_en ?? "");
    setLatitude(facility.latitude?.toString() ?? "");
    setLongitude(facility.longitude?.toString() ?? "");
    setDuplicates([]);
    setDuplicateAcknowledged(false);
    setMessage(
      ar
        ? "تم اختيار المرفق الموجود لاقتراح تعديل عليه."
        : "Existing facility selected for a change proposal.",
    );
  };

  const checkDuplicates = async () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!nameAr.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setBusy(true);
    setMessage("");
    try {
      const rows = await findFacilityDuplicates({ name: nameAr, latitude: lat, longitude: lng });
      setDuplicates(rows);
      setMessage(
        rows.length
          ? ar
            ? "وجدنا أماكن محتملة قريبة. اختر المكان الموجود أو أكّد أن اقتراحك مختلف."
            : "We found possible nearby matches. Use the existing place or confirm yours is different."
          : ar
            ? "لم نجد تطابقًا قريبًا واضحًا. يمكنك متابعة الإرسال."
            : "No clear nearby match was found. You can continue.",
      );
    } catch {
      setMessage(ar ? "تعذر فحص التكرار الآن." : "Duplicate check is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  const submitProposal = async () => {
    if (!user) return;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!nameAr.trim() || !categoryAr.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMessage(
        ar ? "أكمل الاسم والتصنيف والإحداثيات." : "Complete the name, category, and coordinates.",
      );
      return;
    }
    if (duplicates.length && !duplicateAcknowledged) {
      setMessage(
        ar
          ? "راجع الأماكن المحتملة وأكّد أن المكان مختلف."
          : "Review possible matches and confirm this place is different.",
      );
      return;
    }
    setBusy(true);
    try {
      const proposalId = await createFacilityProposal({
        proposalType: mode === "new_facility" ? "new_facility" : "facility_change",
        ...(mode === "facility_change" ? { existingFacilityId: facilityId } : {}),
        nameAr,
        nameEn,
        categoryAr,
        categoryEn,
        areaAr,
        areaEn,
        latitude: lat,
        longitude: lng,
        locationNote,
        duplicateAcknowledged,
        duplicateNote,
      });
      if (file) await uploadProposalEvidence({ proposalId, userId: user.id, file });
      setMessage(
        ar
          ? "تم إرسال المقترح للمراجعة. يمكنك متابعته من حسابك."
          : "Proposal submitted for review. Track it from your account.",
      );
      setFile(null);
      setDuplicates([]);
    } catch (cause) {
      console.error("Facility proposal failed", cause);
      setMessage(
        ar
          ? "لم يُرسل المقترح. لم يتغير سجل المرفق."
          : "Proposal was not submitted. The official facility was unchanged.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    if (!user || !facilityId || reportDetails.trim().length < 4) return;
    setBusy(true);
    try {
      await createFacilityReport(facilityId, reportType, reportDetails);
      setMessage(
        ar
          ? "وصل البلاغ إلى قائمة العمليات دون تغيير البيانات المنشورة."
          : "Report added to Operations without changing public data.",
      );
      setReportDetails("");
    } catch {
      setMessage(ar ? "تعذر إرسال البلاغ الآن." : "The report could not be submitted.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-4">
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        role="group"
        aria-label={ar ? "نوع العملية" : "Operation type"}
      >
        {(
          [
            ["new_facility", ar ? "اقتراح مرفق" : "Suggest facility", Building2],
            ["facility_change", ar ? "اقتراح تعديل" : "Suggest change", RefreshCw],
            ["report", ar ? "الإبلاغ عن تغيير" : "Report change", Flag],
          ] as const
        ).map(([key, label, Icon]) => (
          <Button
            key={key}
            variant={mode === key ? "primary" : "outline"}
            size="sm"
            aria-pressed={mode === key}
            onClick={() => chooseMode(key)}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>

      {!user ? (
        <div className="mt-5 rounded-xl bg-muted p-4 text-sm">
          <p>
            {ar
              ? "سجّل الدخول لإرسال المقترحات والبلاغات ومتابعتها."
              : "Sign in to submit and track proposals or reports."}
          </p>
          <Link to="/account" className="mt-3 inline-block font-semibold text-primary">
            {ar ? "الذهاب إلى حسابي" : "Go to account"}
          </Link>
        </div>
      ) : mode === "report" ? (
        <div className="mt-5 space-y-4">
          <SelectFacility
            facilities={facilities}
            value={facilityId}
            onChange={selectFacility}
            ar={ar}
          />
          <label className="block text-sm font-semibold" htmlFor="report-type">
            {ar ? "نوع البلاغ" : "Report type"}
          </label>
          <select
            id="report-type"
            className={fieldClass}
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
          >
            <option value="outdated_information">
              {ar ? "معلومات قديمة" : "Outdated information"}
            </option>
            <option value="facility_changed">{ar ? "تغيّر المرفق" : "Facility changed"}</option>
            <option value="incorrect_location_name">
              {ar ? "الموقع أو الاسم غير صحيح" : "Incorrect location or name"}
            </option>
            <option value="evidence_update">
              {ar ? "الأدلة تحتاج تحديثًا" : "Evidence needs an update"}
            </option>
          </select>
          <label className="block text-sm font-semibold" htmlFor="report-details">
            {ar ? "ما الذي تغيّر؟" : "What changed?"}
          </label>
          <textarea
            id="report-details"
            rows={4}
            className={`${fieldClass} py-3`}
            value={reportDetails}
            onChange={(event) => setReportDetails(event.target.value)}
          />
          <Button
            block
            disabled={busy || !facilityId || reportDetails.trim().length < 4}
            onClick={() => void submitReport()}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {ar ? "إرسال البلاغ" : "Submit report"}
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {mode === "facility_change" ? (
            <SelectFacility
              facilities={facilities}
              value={facilityId}
              onChange={selectFacility}
              ar={ar}
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="proposal-name-ar"
              label={ar ? "الاسم بالعربية" : "Arabic name"}
              value={nameAr}
              onChange={setNameAr}
              required
            />
            <Field
              id="proposal-name-en"
              label={ar ? "الاسم بالإنجليزية (اختياري)" : "English name (optional)"}
              value={nameEn}
              onChange={setNameEn}
            />
            <Field
              id="proposal-category-ar"
              label={ar ? "التصنيف بالعربية" : "Arabic category"}
              value={categoryAr}
              onChange={setCategoryAr}
              required
            />
            <Field
              id="proposal-category-en"
              label={ar ? "التصنيف بالإنجليزية (اختياري)" : "English category (optional)"}
              value={categoryEn}
              onChange={setCategoryEn}
            />
            <Field
              id="proposal-area-ar"
              label={ar ? "المنطقة بالعربية" : "Arabic area"}
              value={areaAr}
              onChange={setAreaAr}
            />
            <Field
              id="proposal-area-en"
              label={ar ? "المنطقة بالإنجليزية" : "English area"}
              value={areaEn}
              onChange={setAreaEn}
            />
          </div>
          <LocationPicker
            latitude={latitude ? Number(latitude) : null}
            longitude={longitude ? Number(longitude) : null}
            onChange={(lat, lng, label) => {
              setLatitude(lat.toFixed(7));
              setLongitude(lng.toFixed(7));
              if (label && !locationNote) setLocationNote(label);
            }}
          />
          <label className="block text-sm font-semibold" htmlFor="proposal-location-note">
            {ar ? "ملاحظة عن الموقع (اختياري)" : "Location note (optional)"}
          </label>
          <textarea
            id="proposal-location-note"
            rows={3}
            className={`${fieldClass} py-3`}
            value={locationNote}
            onChange={(event) => setLocationNote(event.target.value)}
          />
          {mode === "new_facility" ? (
            <>
              <Button variant="outline" disabled={busy} onClick={() => void checkDuplicates()}>
                <MapPin className="size-4" />
                {ar ? "فحص الأماكن القريبة" : "Check nearby places"}
              </Button>
              {duplicates.length ? (
                <div className="rounded-xl border border-caution/40 bg-caution-soft p-4">
                  <p className="font-bold">{ar ? "أماكن محتملة" : "Possible matches"}</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {duplicates.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span>
                          {ar ? item.name_ar : item.name_en || item.name_ar} ·{" "}
                          {Math.round(item.distance_meters)}m
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => chooseExistingFacility(item.id)}
                        >
                          {ar ? "اقتراح تعديل" : "Use existing"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={duplicateAcknowledged}
                      onChange={(event) => setDuplicateAcknowledged(event.target.checked)}
                    />
                    {ar
                      ? "راجعت النتائج وهذا مكان مختلف"
                      : "I reviewed these; this is a different place"}
                  </label>
                  {duplicateAcknowledged ? (
                    <Field
                      id="duplicate-note"
                      label={ar ? "اشرح الفرق" : "Explain the difference"}
                      value={duplicateNote}
                      onChange={setDuplicateNote}
                      required
                    />
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-input px-4 text-sm font-semibold">
            <ImagePlus className="size-5 text-primary" aria-hidden="true" />
            <span>
              {file ? file.name : ar ? "إضافة صورة أولى (اختياري)" : "Add initial image (optional)"}
            </span>
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {ar
              ? "يبقى المقترح والصورة خاصين حتى موافقة مدير مُتاح."
              : "The proposal and image remain private until a MUTAH admin approves it."}
          </p>
          <Button
            block
            disabled={busy || (!facilityId && mode === "facility_change")}
            onClick={() => void submitProposal()}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {ar ? "إرسال للمراجعة" : "Submit for review"}
          </Button>
        </div>
      )}
      <p aria-live="polite" className="mt-4 text-sm font-semibold">
        {message}
      </p>
    </Card>
  );
}

function SelectFacility({
  facilities,
  value,
  onChange,
  ar,
}: {
  facilities: OperationalFacility[];
  value: string;
  onChange: (id: string) => void;
  ar: boolean;
}) {
  return (
    <div>
      <label htmlFor="proposal-facility" className="mb-2 block text-sm font-semibold">
        {ar ? "المرفق" : "Facility"}
      </label>
      <select
        id="proposal-facility"
        className={fieldClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {facilities.map((facility) => (
          <option key={facility.id} value={facility.id}>
            {ar ? facility.name_ar : facility.name_en || facility.name_ar}
          </option>
        ))}
      </select>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: "decimal";
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        className={fieldClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        inputMode={inputMode}
      />
    </div>
  );
}
