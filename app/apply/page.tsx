import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CREATOR_COOKIE, verifySessionToken } from "@/lib/lineSession";
import type { Brand } from "@/types";
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

  return <ApplyForm creatorName={session.name} brands={brands} />;
}
