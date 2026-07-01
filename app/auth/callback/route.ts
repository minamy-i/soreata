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

      // / 始まりのパスのみ許可（オープンリダイレクト対策）
      const rawNext = searchParams.get('next') ?? '';
      const safeNext = rawNext.startsWith('/') ? rawNext : null;

      // accounts を登録（初回のみ実効・以降はスキップ）
      await supabase.from('accounts').upsert({ id: userId, email }, { onConflict: 'id' });

      // persons の確認
      const { data: person } = await supabase
        .from('persons')
        .select('id')
        .eq('account_id', userId)
        .single();

      if (!person) {
        // 初回ログイン：personsを作成してアカウント設定へ
        const { data: newPerson } = await supabase
          .from('persons')
          .insert({ account_id: userId, nickname: '' })
          .select('id')
          .single();
        if (newPerson) {
          return NextResponse.redirect(`${origin}/account/settings?first=1`);
        }
      } else {
        // 2回目以降：next があればそこへ、なければダッシュボードへ
        const dest = safeNext ?? `/home/${person.id}`;
        return NextResponse.redirect(`${origin}${dest}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
