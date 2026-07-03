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

      // accounts を登録（初回のみ実効・以降はスキップ）
      await supabase.from('accounts').upsert({ id: userId, email }, { onConflict: 'id' });

      // persons の確認
      const { data: person } = await supabase
        .from('persons')
        .select('id')
        .eq('account_id', userId)
        .single();

      if (!person) {
        // 初回ログイン：personsを作成してアカウントダッシュボードへ
        await supabase
          .from('persons')
          .insert({ account_id: userId, nickname: '' });
      }

      return NextResponse.redirect(`${origin}/account${!person ? '?first=1' : ''}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
