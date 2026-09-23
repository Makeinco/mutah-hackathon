import { createFileRoute, Link } from "@tanstack/react-router";
import type { EmailOtpType } from "@supabase/supabase-js";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/mutah/AppShell";
import { Button, Card } from "@/components/mutah/ui";
import { safeAuthReturn } from "@/lib/mutah/auth-navigation";
import { useLang } from "@/lib/mutah/i18n";
import { supabase } from "@/lib/mutah/supabase-client";

const searchSchema = z.object({ next: z.string().optional() });
const OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
]);

type ConfirmState = "working" | "success" | "expired" | "error";

export const Route = createFileRoute("/auth/confirm")({
  validateSearch: searchSchema,
  component: AuthConfirmPage,
});

function AuthConfirmPage() {
  const { next: requestedNext } = Route.useSearch();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [state, setState] = useState<ConfirmState>("working");
  const next = safeAuthReturn(requestedNext);

  useEffect(() => {
    let active = true;
    const confirm = async () => {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const errorCode = query.get("error_code") || hash.get("error_code");
      const errorDescription = query.get("error_description") || hash.get("error_description");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const otpType = query.get("type");

      window.history.replaceState(null, "", `/auth/confirm?next=${encodeURIComponent(next)}`);

      if (errorCode || errorDescription) {
        if (active)
          setState(
            `${errorCode ?? ""} ${errorDescription ?? ""}`
              .toLowerCase()
              .match(/expired|invalid|otp/)
              ? "expired"
              : "error",
          );
        return;
      }

      let session = null;
      let error: Error | null = null;
      if (accessToken && refreshToken) {
        const result = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        session = result.data.session;
        error = result.error;
      } else if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        session = result.data.session;
        error = result.error;
      } else if (tokenHash && otpType && OTP_TYPES.has(otpType as EmailOtpType)) {
        const result = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as EmailOtpType,
        });
        session = result.data.session;
        error = result.error;
      } else {
        const result = await supabase.auth.getSession();
        session = result.data.session;
        error = result.error;
      }

      if (!active) return;
      if (error || !session) {
        setState(error?.message.toLowerCase().match(/expired|invalid|otp/) ? "expired" : "error");
        return;
      }
      setState("success");
      window.setTimeout(() => window.location.replace(next), 250);
    };
    void confirm();
    return () => {
      active = false;
    };
  }, [next]);

  return (
    <AppShell title={ar ? "إكمال تسجيل الدخول" : "Complete sign-in"}>
      <div className="mx-auto max-w-lg">
        <Card className="text-center">
          {state === "working" ? (
            <LoaderCircle className="mx-auto size-9 animate-spin text-primary" aria-hidden="true" />
          ) : state === "success" ? (
            <CheckCircle2 className="mx-auto size-9 text-access-strong" aria-hidden="true" />
          ) : (
            <TriangleAlert className="mx-auto size-9 text-caution" aria-hidden="true" />
          )}
          <h1 className="mt-3 text-xl font-bold">
            {state === "working"
              ? ar
                ? "جارٍ إكمال تسجيل الدخول…"
                : "Completing sign-in…"
              : state === "success"
                ? ar
                  ? "تم تسجيل الدخول"
                  : "Signed in"
                : state === "expired"
                  ? ar
                    ? "انتهت صلاحية رابط الدخول أو تم استخدامه"
                    : "This sign-in link expired or was already used"
                  : ar
                    ? "تعذر إكمال تسجيل الدخول"
                    : "Sign-in could not be completed"}
          </h1>
          <p
            role={state === "error" || state === "expired" ? "alert" : "status"}
            className="mt-2 text-sm text-muted-foreground"
          >
            {state === "working"
              ? ar
                ? "لن نعرض بيانات الرابط، وسنزيلها قبل المتابعة."
                : "Link data will not be shown and will be removed before continuing."
              : state === "success"
                ? ar
                  ? "ستعود الآن إلى الخطوة التي بدأت منها."
                  : "You will now return to the step where you started."
                : ar
                  ? "لم يتم فقد مساهمتك. يمكنك طلب رابط جديد عند السماح بذلك."
                  : "Your contribution was not lost. You can request a new link when allowed."}
          </p>
          {state === "error" || state === "expired" ? (
            <Link to="/account" search={{ next }} className="mt-5 inline-block">
              <Button>{ar ? "طلب رابط دخول جديد" : "Request a new sign-in link"}</Button>
            </Link>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}
