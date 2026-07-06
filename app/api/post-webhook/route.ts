import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { buildRecordText } from '@/lib/record-text';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  }

  const { teamId, recordId } = await req.json();

  if (!teamId || !recordId) {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 });
  }

  // 呼び出し元がこのチームのメンバーか確認
  const { data: myMembership } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('account_id', session.user.id)
    .is('revoked_at', null)
    .maybeSingle();

  if (!myMembership) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  const { data: team } = await supabase
    .from('teams')
    .select('webhook_url, webhook_platform')
    .eq('id', teamId)
    .single();

  if (!team?.webhook_url || !team.webhook_platform) {
    return NextResponse.json({ error: '投稿先が未設定です' }, { status: 400 });
  }

  const { data: decomp } = await supabase
    .from('decompositions')
    .select('abilities')
    .eq('id', recordId)
    .eq('team_id', teamId)
    .single();

  if (!decomp) {
    return NextResponse.json({ error: '記録が見つかりません' }, { status: 404 });
  }

  const text = buildRecordText(decomp.abilities);
  const payload = team.webhook_platform === 'discord' ? { content: text } : { text };

  try {
    const res = await fetch(team.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('webhook request failed');
  } catch {
    return NextResponse.json({ error: '投稿に失敗しました' }, { status: 502 });
  }

  const postedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('decompositions')
    .update({ posted_at: postedAt })
    .eq('id', recordId);

  if (updateError) {
    return NextResponse.json({ error: '投稿日時の保存に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ postedAt });
}
