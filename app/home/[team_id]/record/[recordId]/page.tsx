import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import RecordDetail from "./RecordDetail";

export type Ability = {
  title: string;
  description: string;
  person: string;
  solution: string;
  confirmed_at: string | null;
};

export default async function RecordPage({
  params,
}: {
  params: Promise<{ team_id: string; recordId: string }>;
}) {
  const { team_id, recordId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect(`/login?next=/home/${team_id}/record/${recordId}`);

  // 自分の所属確認（非メンバー・空セルが残っている場合は/accountへ）
  const { data: myMembership } = await supabase
    .from('team_members')
    .select('nickname, relationship, role')
    .eq('team_id', team_id)
    .eq('account_id', session.user.id)
    .is('revoked_at', null)
    .single();

  if (!myMembership || !myMembership.nickname || !myMembership.relationship) {
    redirect('/account');
  }

  // AI分析記録の取得
  const { data: decomp } = await supabase
    .from('decompositions')
    .select('id, task_text, abilities, created_at')
    .eq('id', recordId)
    .eq('team_id', team_id)
    .single();

  if (!decomp) redirect(`/home/${team_id}`);

  return (
    <RecordDetail
      teamId={team_id}
      canDelete={myMembership.role === 'owner'}
      decomp={{
        id: decomp.id,
        task_text: decomp.task_text,
        abilities: decomp.abilities as Ability[],
        created_at: decomp.created_at,
      }}
    />
  );
}
