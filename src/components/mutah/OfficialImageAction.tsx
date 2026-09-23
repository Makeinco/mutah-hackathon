import { Link } from "@tanstack/react-router";
import { FileImage, ImagePlus, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AuthCheckpoint } from "./AuthCheckpoint";
import { useAuth } from "@/lib/mutah/auth";
import { facilityPhotoReturnPath } from "@/lib/mutah/auth-navigation";
import { useLang } from "@/lib/mutah/i18n";
import {
  DisplayImageFlowError,
  getMyActiveDisplayImageProposal,
  proposeFacilityDisplayImage,
  type DisplayImageFlowErrorCode,
  type DisplayImageProposal,
} from "@/lib/mutah/operational";
import type { Facility } from "@/lib/mutah/types";
import { Button, Card } from "./ui";

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const SMALL_IMAGE_WIDTH = 640;
const SMALL_IMAGE_HEIGHT = 360;

type Selection = { file: File; width: number; height: number };

async function decodeImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("IMAGE_DIMENSIONS_INVALID");
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function validateImage(file: File): Promise<Selection> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) throw new Error("UNSUPPORTED_FILE");
  if (!file.size) throw new Error("EMPTY_FILE");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("FILE_TOO_LARGE");
  return { file, ...(await decodeImage(file)) };
}

function pendingStatusText(proposal: DisplayImageProposal, ar: boolean) {
  if (proposal.status === "clarification_requested")
    return ar ? "يحتاج اقتراحك إلى توضيح" : "Your proposal needs clarification";
  if (proposal.status === "recommended")
    return ar
      ? "أوصى المراجع بالصورة وهي بانتظار المدير"
      : "Recommended and awaiting admin approval";
  return ar ? "اقتراح الصورة قيد المراجعة" : "Your photo proposal is under review";
}

function safeErrorText(error: unknown, ar: boolean) {
  const localCode = error instanceof Error ? error.message : "";
  if (localCode === "UNSUPPORTED_FILE" || localCode === "IMAGE_DECODE_FAILED")
    return ar
      ? "اختر ملف صورة صالحًا بصيغة JPEG أو PNG أو WebP."
      : "Choose a valid JPEG, PNG, or WebP image.";
  if (localCode === "EMPTY_FILE")
    return ar
      ? "ملف الصورة فارغ. اختر صورة أخرى."
      : "The image file is empty. Choose another photo.";
  if (localCode === "FILE_TOO_LARGE")
    return ar ? "حجم الصورة أكبر من 8 م.ب." : "The image is larger than 8 MB.";
  if (localCode === "IMAGE_DIMENSIONS_INVALID")
    return ar ? "تعذر قراءة أبعاد الصورة." : "The image dimensions could not be read.";

  const code: DisplayImageFlowErrorCode =
    error instanceof DisplayImageFlowError ? error.code : "upload_failed";
  if (code === "session_expired")
    return ar
      ? "انتهت جلسة تسجيل الدخول. سجّل الدخول ثم أعد المحاولة."
      : "Your sign-in session expired. Sign in and try again.";
  if (code === "pending_proposal")
    return ar
      ? "لديك اقتراح صورة قيد المراجعة لهذا المرفق."
      : "You already have a photo proposal under review for this facility.";
  if (code === "facility_unavailable")
    return ar
      ? "هذا المرفق غير متاح لاستقبال اقتراح صورة الآن."
      : "This facility cannot accept a photo proposal right now.";
  if (code === "permission_denied")
    return ar
      ? "لا يملك حسابك صلاحية إرسال هذا الاقتراح."
      : "Your account does not have permission to send this proposal.";
  if (code === "proposal_creation_failed")
    return ar
      ? "تعذر إنشاء اقتراح الصورة. لم تتغير الصورة الرسمية."
      : "The proposal could not be created. The official image is unchanged.";
  return ar
    ? "تعذر رفع الصورة. تحقق من الاتصال وحاول مرة أخرى."
    : "The photo could not be uploaded. Check your connection and try again.";
}

export function OfficialImageAction({ facility }: { facility: Facility }) {
  const { user, profile } = useAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState<DisplayImageProposal | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);
  const userId = user?.id;
  const databaseId = facility.databaseId;
  const returnTo = facilityPhotoReturnPath(facility.id);
  const previewUrl = useMemo(
    () => (selection ? URL.createObjectURL(selection.file) : ""),
    [selection],
  );
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  useEffect(() => {
    if (user) setAuthExpired(false);
    else if (selection) setAuthExpired(true);
  }, [selection, user]);

  const eligible =
    Boolean(userId && databaseId) && (profile?.role === "contributor" || profile?.role === "admin");
  const actionLabel = facility.imageUrl
    ? ar
      ? "اقترح تحديث الصورة"
      : "Suggest photo update"
    : ar
      ? "اقترح صورة للمرفق"
      : "Suggest a facility photo";

  useEffect(() => {
    let active = true;
    if (!eligible || !databaseId || !userId) {
      setPending(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    void getMyActiveDisplayImageProposal(databaseId, userId)
      .then((proposal) => {
        if (active) setPending(proposal);
      })
      .catch(() => {
        if (active)
          setMessage(
            ar ? "تعذر التحقق من حالة اقتراحاتك." : "Proposal status could not be checked.",
          );
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [ar, databaseId, eligible, userId]);

  const clearSelection = () => {
    setSelection(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const selectFile = async (file: File | null) => {
    setError("");
    setMessage("");
    if (!file) {
      clearSelection();
      return;
    }
    try {
      setSelection(await validateImage(file));
    } catch (nextError) {
      clearSelection();
      setError(safeErrorText(nextError, ar));
    }
  };

  const submit = async () => {
    if (!selection || !databaseId || !userId || busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await proposeFacilityDisplayImage({
        facilityId: databaseId,
        userId,
        file: selection.file,
        context: note,
      });
      const activeProposal = await getMyActiveDisplayImageProposal(databaseId, userId);
      setPending(activeProposal);
      setSuccess(true);
      setOpen(false);
      clearSelection();
      setNote("");
    } catch (nextError) {
      if (nextError instanceof DisplayImageFlowError && nextError.code === "session_expired")
        setAuthExpired(true);
      setError(safeErrorText(nextError, ar));
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <Card className="mt-4 border-access/30 bg-access-soft/40">
        <h2 className="text-lg font-bold">
          {ar ? "تم إرسال صورة المرفق للمراجعة" : "Facility photo sent for review"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar
            ? "لن تظهر الصورة للعامة حتى يراجعها فريق مُتاح ويعتمدها المدير."
            : "The photo will not appear publicly until it is reviewed by MUTAH and approved by an admin."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSuccess(false)}>
            {ar ? "العودة إلى المرفق" : "Back to facility"}
          </Button>
          <Link
            to="/account"
            hash="display-image-proposals"
            className="inline-flex min-h-11 items-center rounded-xl border-2 border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ar ? "عرض حالة الاقتراح" : "View proposal status"}
          </Link>
        </div>
      </Card>
    );
  }

  if (pending) {
    return (
      <Card className="mt-4 border-primary/20 bg-primary-soft/35">
        <h2 className="font-bold">{pendingStatusText(pending, ar)}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar
            ? "تبقى الصورة خاصة ولا تحل محل الصورة الرسمية أثناء المراجعة."
            : "The photo remains private and does not replace the official image during review."}
        </p>
        <Link
          to="/account"
          hash="display-image-proposals"
          className="mt-3 inline-flex min-h-11 items-center rounded-xl border-2 border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {ar ? "عرض حالة الاقتراح" : "View proposal status"}
        </Link>
      </Card>
    );
  }

  if (!eligible) {
    if (!databaseId) return null;
    return (
      <div id="facility-photo-proposal" className="mt-4">
        {!user ? (
          <AuthCheckpoint next={returnTo} context="facility-photo" recovery={authExpired} />
        ) : (
          <Card className="border-2 border-dashed border-input bg-surface">
            <h2 className="font-bold">
              {ar
                ? "اقتراح صورة المرفق غير متاح لهذا الحساب"
                : "Facility photo proposals are unavailable for this account"}
            </h2>
          </Card>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <div id="facility-photo-proposal" className="mt-4">
        <Button variant="outline" disabled={checking} onClick={() => setOpen(true)}>
          {checking ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-4" aria-hidden="true" />
          )}
          {actionLabel}
        </Button>
        {message ? (
          <p role="status" className="mt-2 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  const smallImage =
    selection && (selection.width < SMALL_IMAGE_WIDTH || selection.height < SMALL_IMAGE_HEIGHT);

  return (
    <div id="facility-photo-proposal" className="mt-4">
      <Card className="bg-surface">
        <h2 className="text-lg font-bold">{ar ? "صورة المرفق" : "Facility photo"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar
            ? "أضف صورة واضحة تمثل المرفق نفسه. هذه الصورة لعرض المرفق فقط، ولا تُستخدم تلقائيًا كدليل على الإتاحة."
            : "Add a clear photo that represents the facility itself. This photo is for facility display only and is not automatically used as accessibility evidence."}
        </p>
        <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
          <li>
            {ar
              ? "صوّر الواجهة أو المدخل الأمامي أو منظرًا معروفًا للمرفق."
              : "Use the exterior, front entrance, or a recognizable facility view."}
          </li>
          <li>
            {ar
              ? "اجعل المرفق واضحًا، وتجنب صور الشعارات وحدها أو الصور التي تركز على أشخاص."
              : "Keep the facility identifiable; avoid logo-only or people-focused images."}
          </li>
          <li>
            {ar
              ? "هذا ليس مسار رفع أدلة الإتاحة."
              : "This is not the accessibility-evidence upload flow."}
          </li>
        </ul>

        <div className="mt-4 rounded-2xl border-2 border-input bg-background p-4 text-center">
          <FileImage className="mx-auto size-7 text-primary" aria-hidden="true" />
          <label
            htmlFor={inputId}
            className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-within:ring-2 focus-within:ring-ring"
          >
            {selection ? (ar ? "تغيير الصورة" : "Change photo") : ar ? "اختر صورة" : "Choose photo"}
          </label>
          <input
            ref={fileInput}
            id={inputId}
            name="facility-display-photo"
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label={ar ? "اختر صورة للمرفق" : "Choose a facility photo"}
            onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {ar ? "JPEG أو PNG أو WebP — حتى 8 م.ب." : "JPEG, PNG, or WebP — up to 8 MB"}
          </p>
        </div>

        {previewUrl && selection ? (
          <figure className="mt-4">
            <img
              src={previewUrl}
              alt={ar ? "معاينة صورة المرفق المقترحة" : "Preview of the proposed facility photo"}
              className="aspect-video w-full rounded-2xl object-cover"
            />
            <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate" dir="auto">
                {selection.file.name}
              </span>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={clearSelection}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {ar ? "إزالة" : "Remove"}
              </button>
            </figcaption>
            {smallImage ? (
              <p className="mt-2 rounded-xl bg-caution-soft p-3 text-sm">
                {ar
                  ? "الصورة صغيرة وقد لا تبدو واضحة في بطاقة المرفق. يمكنك اختيار صورة أكبر."
                  : "This image is small and may not look clear on the facility card. You may choose a larger one."}
              </p>
            ) : null}
          </figure>
        ) : null}

        <div className="mt-4">
          <label htmlFor={`${inputId}-note`} className="text-sm font-semibold">
            {ar ? "ملاحظة للمراجع — اختيارية" : "Note for reviewer — optional"}
          </label>
          <p id={`${inputId}-note-help`} className="mt-1 text-sm text-muted-foreground">
            {ar
              ? "يمكنك توضيح مكان الصورة أو سبب اقتراحها."
              : "You can explain where the photo was taken or why you are suggesting it."}
          </p>
          <textarea
            id={`${inputId}-note`}
            name="facility-display-photo-reviewer-note"
            autoComplete="off"
            aria-describedby={`${inputId}-note-help`}
            rows={3}
            className="mt-2 w-full rounded-xl border-2 border-input bg-background p-3 text-sm"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {authExpired && !user ? (
          <div className="mt-4">
            <AuthCheckpoint next={returnTo} context="facility-photo" recovery />
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={!selection || busy} onClick={() => void submit()}>
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-4" aria-hidden="true" />
            )}
            {busy ? (ar ? "جارٍ الإرسال…" : "Sending…") : actionLabel}
          </Button>
          <Button
            variant="quiet"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              clearSelection();
              setError("");
            }}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {ar ? "إلغاء" : "Cancel"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
