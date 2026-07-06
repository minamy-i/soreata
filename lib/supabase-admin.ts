import { createClient } from "@supabase/supabase-js";

// service-roleキーでRLSを無視する管理クライアント。サーバー専用（クライアントからimportしない）
// 用途：招待作成時のメアド実在確認など、本人以外のaccountsを照合する必要がある処理のみ
export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
