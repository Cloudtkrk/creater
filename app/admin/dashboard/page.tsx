import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/adminAuth";
import type { Application } from "@/types";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // middleware に加えてページ側でも認証チェック
  const token = cookies().get(ADMIN_COOKIE)?.value;
  const ok = await verifyAdminToken(token);
  if (!ok) {
    redirect("/admin");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("申請一覧の取得に失敗:", error);
  }

  const applications = (data ?? []) as Application[];

  return <Dashboard initialApplications={applications} />;
}
