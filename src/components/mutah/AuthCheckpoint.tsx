import { LogIn, MailCheck } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useAuth, type AuthRequestErrorKind } from "@/lib/mutah/auth";
import { useLang } from "@/lib/mutah/i18n";
import { Button, Card } from "./ui";

type AuthCheckpointContext = "account" | "contribution" | "facility-photo";

function errorMessage(kind: AuthRequestErrorKind, ar: boolean) {
  if (kind === "rate_limit")
    return ar
      ? "تم طلب رابط دخول مؤخرًا. انتظر قليلًا قبل طلب رابط جديد."
      : "A sign-in link was requested recently. Please wait before requesting another one.";
  if (kind === "invalid_redirect")
    return ar
      ? "تعذر بدء تسجيل الدخول من هذه الصفحة. لم يتم فقد مساهمتك."
      : "Sign-in could not start from this page. Your contribution was not lost.";
  if (kind === "provider_failure")
    return ar
      ? "تعذر إرسال رابط الدخول الآن. حاول مرة أخرى لاحقًا."
      : "The sign-in link could not be sent right now. Try again later.";
  if (kind === "user_error")
    return ar
      ? "تعذر استخدام هذا البريد للدخول. تحقق منه وحاول مرة أخرى."
      : "This email could not be used to sign in. Check it and try again.";
  return ar
    ? "تعذر إرسال رابط الدخول الآن. حاول مرة أخرى لاحقًا."
    : "The sign-in link could not be sent right now. Try again later.";
}

function copy(context: AuthCheckpointContext, recovery: boolean, ar: boolean) {
  if (recovery)
    return ar
      ? {
          title: "انتهت جلسة الدخول",
          body: "صورك ومراجعتك ما زالت هنا. سجّل الدخول للمتابعة.",
          action: "تسجيل الدخول والمتابعة",
        }
      : {
          title: "Your sign-in session ended",
          body: "Your photos and review are still here. Sign in to continue.",
          action: "Sign in and continue",
        };
  if (context === "facility-photo")
    return ar
      ? {
          title: "سجّل الدخول لاقتراح صورة للمرفق",
          body: "سنُبقي المرفق نفسه، ثم تعود مباشرة لإكمال اقتراح الصورة.",
          action: "تسجيل الدخول والمتابعة",
        }
      : {
          title: "Sign in to suggest a facility photo",
          body: "We’ll keep this facility so you can continue your photo proposal after signing in.",
          action: "Sign in and continue",
        };
  if (context === "contribution")
    return ar
      ? {
          title: "سجّل الدخول لإضافة صور حقيقية",
          body: "سنُبقي المرفق والمنطقة التي اخترتها، ثم تعود مباشرة لإكمال مساهمتك.",
          action: "تسجيل الدخول والمتابعة",
        }
      : {
          title: "Sign in to add real photos",
          body: "We’ll keep your facility and selected area so you can continue your contribution after signing in.",
          action: "Sign in and continue",
        };
  return ar
    ? {
        title: "الدخول للمساهمة",
        body: "ندخل عبر رابط آمن إلى البريد الإلكتروني — بدون كلمة مرور.",
        action: "أرسل رابط الدخول",
      }
    : {
        title: "Sign in to contribute",
        body: "Sign in with a secure email link — no password required.",
        action: "Send sign-in link",
      };
}

export function AuthCheckpoint({
  next,
  context = "account",
  recovery = false,
}: {
  next: string;
  context?: AuthCheckpointContext;
  recovery?: boolean;
}) {
  const { signInWithEmail } = useAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorKind, setErrorKind] = useState<AuthRequestErrorKind | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const text = copy(context, recovery, ar);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(false), 60_000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submit = async () => {
    if (!email.trim() || sending || cooldown) return;
    setSending(true);
    setErrorKind(null);
    const result = await signInWithEmail(email.trim(), lang, next);
    setSending(false);
    if (result.error) {
      setErrorKind(result.error.kind);
      if (result.error.kind === "rate_limit") setCooldown(true);
      return;
    }
    setSent(true);
    setCooldown(true);
  };

  return (
    <Card className="border-2 border-primary/25 bg-primary-soft/35">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          {sent ? (
            <MailCheck className="size-5" aria-hidden="true" />
          ) : (
            <LogIn className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">{text.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{text.body}</p>
          {context !== "account" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {ar
                ? "افتح رابط البريد في علامة تبويب جديدة من هذا المتصفح لتبقى الصفحة الحالية كما هي."
                : "Open the email link in a new tab in this browser to keep this page in place."}
            </p>
          ) : null}

          {sent ? (
            <div className="mt-4">
              <p role="status" className="text-sm font-semibold text-access-strong">
                {ar
                  ? "أرسلنا رابط دخول آمن. افتحه لإكمال الدخول والعودة إلى هذه الخطوة."
                  : "We sent a secure sign-in link. Open it to finish signing in and return to this step."}
              </p>
              <Button
                variant="quiet"
                className="mt-3"
                disabled={cooldown}
                onClick={() => setSent(false)}
              >
                {ar ? "طلب رابط جديد" : "Request another link"}
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <label htmlFor={inputId} className="mt-4 block text-sm font-semibold">
                {ar ? "البريد الإلكتروني" : "Email"}
              </label>
              <input
                id={inputId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border-2 border-input bg-background px-4 text-base"
                placeholder="name@example.com"
              />
              <Button
                type="submit"
                className="mt-3"
                disabled={sending || cooldown || !email.trim()}
              >
                {sending ? (ar ? "جاري الإرسال…" : "Sending…") : text.action}
              </Button>
            </form>
          )}

          {errorKind ? (
            <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
              {errorMessage(errorKind, ar)}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
