import { redirect } from "next/navigation";
import { site } from "@/lib/site";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/current-admin";
import { isAdminConfigured } from "@/lib/session";

export const metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");
  return (
    <main className="login-card" id="content">
      <p className="eyebrow">{site.name}</p>
      <h1>Admin</h1>
      {isAdminConfigured() ? (
        <LoginForm />
      ) : (
        <p>Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET before signing in.</p>
      )}
    </main>
  );
}
