import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApplyForm from "./ApplyForm";

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

  return <ApplyForm creatorName={name} creatorEmail={email} />;
}
