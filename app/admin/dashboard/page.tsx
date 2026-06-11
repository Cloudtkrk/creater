import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/adminAuth";
import type { Application, Brand } from "@/types";
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
  const [{ data, error }, { data: brandData, error: brandError }] =
    await Promise.all([
      supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("brands").select("*").order("name", { ascending: true }),
    ]);

  if (error) {
    console.error("申請一覧の取得に失敗:", error);
  }
  if (brandError) {
    console.error("ブランド一覧の取得に失敗:", brandError);
  }

  const applications = (data ?? []) as Application[];
  const brands = (brandData ?? []) as Brand[];

  return (
    <Dashboard initialApplications={applications} initialBrands={brands} />
  );
}
