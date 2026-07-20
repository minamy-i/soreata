import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { myMembershipQuery } from './team-members';

// 未ログインなら/へ（AI提案画面に誘導。ログインは常設ナビから任意で行う）。サーバーページ共通の入口ガード
export async function requireSession(supabase: SupabaseClient) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/');
  return session;
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
