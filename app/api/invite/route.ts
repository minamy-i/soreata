import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';
import { unauthorized, forbidden } from '@/lib/api-response';
import { myMembershipQuery } from '@/lib/team-members';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  const { teamId, email } = await req.json();
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!teamId || !normalizedEmail) {
    return NextResponse.json({ error: 'メールアドレスを入力してください' }, { status: 400 });
  }

  // 呼び出し元がこのチームのownerか確認（画面のisOwner表示に頼らず、API側で完結させる）
  const { data: myMembership } = await myMembershipQuery<{ role: 'owner' | 'collaborator' }>(
    supabase,
    teamId,
    session.user.id,
    'role'
  ).single();

  if (myMembership?.role !== 'owner') {
    return forbidden();
  }

  const { data: myAccount } = await supabase
    .from('accounts')
    .select('email')
    .eq('id', session.user.id)
    .single();

  if (myAccount?.email?.toLowerCase() === normalizedEmail) {
    return NextResponse.json({ error: '自分自身は招待できません' }, { status: 400 });
  }

  // 他人のaccountsを照合するため、ここだけservice-roleキーを使う
  const admin = createSupabaseAdmin();
  const { data: matchedAccount } = await admin
    .from('accounts')
    .select('id, email')
    .ilike('email', normalizedEmail)
    .is('deleted_at', null)
    .maybeSingle();

  if (!matchedAccount) {
    return NextResponse.json(
      { error: 'このメールアドレスは未登録です。初回ログイン後に再度招待してください' },
      { status: 400 }
    );
  }

  const { data: existingMember } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('account_id', matchedAccount.id)
    .is('revoked_at', null)
    .maybeSingle();

  if (existingMember) {
    return NextResponse.json({ error: 'すでに参加しています' }, { status: 400 });
  }

  const { data: existingInvitation } = await supabase
    .from('invitations')
    .select('id')
    .eq('team_id', teamId)
    .eq('invited_email', matchedAccount.email)
    .maybeSingle();

  if (existingInvitation) {
    return NextResponse.json({ error: 'すでに招待中です' }, { status: 400 });
  }

  const { data: invitation, error: insertError } = await supabase
    .from('invitations')
    .insert({ team_id: teamId, invited_email: matchedAccount.email })
    .select('id, invited_email')
    .single();

  if (insertError || !invitation) {
    return NextResponse.json({ error: '招待の作成に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ invitation });
}
