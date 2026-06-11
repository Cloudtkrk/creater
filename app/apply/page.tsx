import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CREATOR_COOKIE, verifySessionToken } from "@/lib/lineSession";
import type { Brand, Creator } from "@/types";
import ApplyForm from "./ApplyForm";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const token = cookies().get(CREATOR_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    redirect("/");
  }

  // ブランド一覧（管理画面で管理）を取得
  const supabase = createClient();
  const { data: brandRows } = await supabase
    .from("brands")
    .select("*")
    .order("name", { ascending: true });

  const brands = ((brandRows ?? []) as Brand[]).map((b) => b.name);

  // 保存済みの TikTok ID を取得してプリフィルする
  const admin = createAdminClient();
  const { data: creator } = await admin
    .from("creators")
    .select("*")
    .eq("line_user_id", session.uid)
    .maybeSingle<Creator>();

  return (
    <ApplyForm
      creatorName={session.name}
      brands={brands}
      initialTiktokId={creator?.tiktok_id ?? ""}
    />
  );
}
