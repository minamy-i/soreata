import { createSupabaseBrowser } from "@/lib/supabase-browser";

// チームが「空」（協力者0・保留中の招待0・AI分解記録0）かどうかを判定する。
// /account のチーム一覧表と /home/[team_id]/settings のチーム削除セクションで共通利用する。
// 空のチームは確認ダイアログなしで即削除できる（docs/SPEC.md参照）。
export async function isTeamEmpty(
  supabase: ReturnType<typeof createSupabaseBrowser>,
  teamId: string
): Promise<boolean> {
  const [collaborators, invitations, records] = await Promise.all([
    supabase
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('role', 'collaborator')
      .is('revoked_at', null),
    supabase
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId),
    supabase
      .from('decompositions')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId),
  ]);

  return (
    (collaborators.count ?? 0) === 0 &&
    (invitations.count ?? 0) === 0 &&
    (records.count ?? 0) === 0
  );
}
