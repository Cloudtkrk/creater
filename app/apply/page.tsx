import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Brand } from "@/types";
import ApplyForm from "./ApplyForm";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const name =
    (user.user_metadata?.name as string | undefined) ?? user.email ?? "クリエイター";
  const email = user.email ?? "";

  // ブランド一覧（管理画面で管理）を取得
  const { data: brandRows } = await supabase
    .from("brands")
    .select("*")
    .order("name", { ascending: true });

  const brands = ((brandRows ?? []) as Brand[]).map((b) => b.name);

  return (
    <ApplyForm creatorName={name} creatorEmail={email} brands={brands} />
  );
}
