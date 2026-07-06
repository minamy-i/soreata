import type { SupabaseClient } from '@supabase/supabase-js';

// 「有効な所属」の定義（revoked_at が無い＝除名・脱退していない）を1か所にまとめる。
// select句は呼び出し側で指定し、single()/maybeSingle()は呼び出し側で付ける。
// select文字列は変数化するとsupabase-jsの型推論が効かなくなるため、戻り値の形はTで呼び出し側に明示してもらう
type MembershipQuery<T> = {
  single: () => Promise<{ data: T | null; error: unknown }>;
  maybeSingle: () => Promise<{ data: T | null; error: unknown }>;
};

export function myMembershipQuery<T>(
  supabase: SupabaseClient,
  teamId: string,
  accountId: string,
  select: string
): MembershipQuery<T> {
  return supabase
    .from('team_members')
    .select(select)
    .eq('team_id', teamId)
    .eq('account_id', accountId)
    .is('revoked_at', null) as unknown as MembershipQuery<T>;
}
