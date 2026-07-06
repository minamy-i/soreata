import type { SupabaseClient } from '@supabase/supabase-js';

// 空チームの削除処理本体。呼び出し元（/account・チーム設定）は空チーム前提で呼ぶ。
// 中身があるチームの削除（協力者・記録が残っている場合）を実装する際は、ここに処理を追加する
export async function deleteTeamById(supabase: SupabaseClient, teamId: string) {
  return supabase.from('teams').delete().eq('id', teamId);
}
