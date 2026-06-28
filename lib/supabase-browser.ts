import { createBrowserClient } from "@supabase/ssr";

// クライアントコンポーネント（ブラウザ）で使うSupabaseクライアント
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
