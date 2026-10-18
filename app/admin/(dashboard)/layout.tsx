import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminSession } from "@/lib/current-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Admin",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <div className="admin-shell">
      <AdminNav />
      <div className="admin-main" id="content">
        {children}
      </div>
    </div>
  );
}
