import { Link } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/mutah/auth";
import { useLang } from "@/lib/mutah/i18n";
import { Button, Card } from "./ui";

export function RoleGate({
  children,
  allow,
}: {
  children: ReactNode;
  allow: Array<"contributor" | "reviewer" | "admin">;
}) {
  const { ready, user, profile } = useAuth();
  const { lang } = useLang();
  const ar = lang === "ar";

  if (!ready) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <p className="font-semibold">{ar ? "جارٍ التحقق من صلاحية الحساب…" : "Checking account access…"}</p>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <LockKeyhole className="mx-auto size-7 text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-bold">{ar ? "يتطلب تسجيل الدخول" : "Sign-in required"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar ? "هذه المساحة مخصصة لفريق مُتاح والمساهمين المصرح لهم." : "This area is reserved for authorized MUTAH contributors and team members."}
        </p>
        <Link to="/account" className="mt-5 inline-block">
          <Button>{ar ? "الذهاب إلى حسابي" : "Go to account"}</Button>
        </Link>
      </Card>
    );
  }

  if (!profile || !allow.includes(profile.role)) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <LockKeyhole className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-bold">{ar ? "لا توجد صلاحية لهذه المساحة" : "You do not have access to this area"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar ? "لا يمكن تعيين صلاحيات المراجع أو المدير من الحساب نفسه." : "Reviewer and admin access cannot be self-assigned."}
        </p>
      </Card>
    );
  }

  return <>{children}</>;
}
