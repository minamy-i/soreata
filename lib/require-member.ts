import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { myMembershipQuery } from './team-members';

// 未ログインなら/loginへ（元のURLをnextに載せる）。サーバーページ共通の入口ガード
export async function requireSession(supabase: SupabaseClient, next: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/login?next=${next}`);
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
export async function requireMember(supabase: SupabaseClient, teamId: string, next: string) {
  const session = await requireSession(supabase, next);

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
