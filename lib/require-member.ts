import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { myMembershipQuery } from './team-members';
import { unauthorized } from './api-response';

// 未ログインなら/へ（AI提案画面に誘導。ログインは常設ナビから任意で行う）。サーバーページ共通の入口ガード
export async function requireSession(supabase: SupabaseClient) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/');
  return session;
}

// APIルート用の認証チェック。okがfalseの場合はresponseをそのまま返せばよい
// （okをtrueに絞り込めばuserがnon-nullとして扱える判別可能ユニオン）
// getUser()はSupabaseの認証サーバーに問い合わせて署名まで検証する
// （getSession()は形式と有効期限だけで署名を検証しないため使わない。docs/NOTES.md参照）
export async function requireApiUser(
  supabase: SupabaseClient
): Promise<{ ok: true; user: User } | { ok: false; response: NextResponse }> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false, response: unauthorized() };
  }
  return { ok: true, user };
}

type Membership = {
  nickname: string | null;
  relationship: string | null;
  role: 'owner' | 'collaborator';
  can_manage_webhook: boolean;
};

// 認証＋所属チェック（有効なメンバーで、nickname・relationshipが入力済みか）。
// 欠けていれば/accountへ（未入室・空セル残りはチーム内ページに入れないルール）
export async function requireMember(supabase: SupabaseClient, teamId: string) {
  const session = await requireSession(supabase);

  const { data: myMembership } = await myMembershipQuery<Membership>(
    supabase,
    teamId,
    session.user.id,
    'nickname, relationship, role, can_manage_webhook'
  ).single();

  if (!myMembership || !myMembership.nickname || !myMembership.relationship) {
    redirect('/account');
  }

  return { session, membership: myMembership };
}

// select句は呼び出し側で指定する（myMembershipQueryと同じ理由：文字列selectだと型推論が効かないため）
type TeamQuery<T> = {
  single: () => Promise<{ data: T | null; error: unknown }>;
};

// チーム取得＋存在チェック。チームが無ければ/accountへ（チーム自体が削除された場合の入口ガード）
export async function requireTeam<T>(
  supabase: SupabaseClient,
  teamId: string,
  select: string
): Promise<T> {
  const query = supabase
    .from('teams')
    .select(select)
    .eq('id', teamId) as unknown as TeamQuery<T>;

  const { data: team } = await query.single();
  if (!team) redirect('/account');

  return team;
}
