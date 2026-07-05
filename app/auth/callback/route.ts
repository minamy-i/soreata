import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

// Googleログイン後にSupabaseから呼ばれるコールバック
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

    if (session) {
      const userId = session.user.id;
      const email = session.user.email ?? '';

      // accounts を登録（初回のみ実効・以降はスキップ）。team_membersは作らず空アカウントのまま/accountへ
      await supabase.from('accounts').upsert({ id: userId, email }, { onConflict: 'id' });

      return NextResponse.redirect(`${origin}/account`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
