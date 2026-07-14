import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';
import { unauthorized } from '@/lib/api-response';

export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  const userId = session.user.id;
  const admin = createSupabaseAdmin();

  // team_membersの全履歴行（revoked_at問わず）を数える。RLS越しには除名済みの行が見えないため管理クライアントで判定する
  const { count, error: countError } = await admin
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', userId);

  if (countError) {
    return NextResponse.json({ error: '判定に失敗しました' }, { status: 500 });
  }

  if (count === 0) {
    // 履歴が一切無いため、Authユーザーのhard deleteでaccounts行もカスケード削除される
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }
  } else {
    // teams.created_by・team_members等の履歴行がaccountsを参照しているため、
    // accounts行はhard deleteできない（FK違反になる）。論理削除で残す
    const { error: updateError } = await admin
      .from('accounts')
      .update({ deleted_at: new Date().toISOString(), email: null })
      .eq('id', userId);
    if (updateError) {
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    // 行を残したままログインだけ不可にする（hard deleteはaccounts行への参照でFK違反になる）
    const { error: authError } = await admin.auth.admin.deleteUser(userId, true);
    if (authError) {
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
