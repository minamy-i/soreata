import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import RecordDetail from "./RecordDetail";
import { teamDisplayName } from "@/lib/team-display";

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
    .select('id, task_text, abilities, created_at, posted_at')
    .eq('id', recordId)
    .eq('team_id', team_id)
    .single();

  if (!decomp) redirect(`/home/${team_id}`);

  // Webhook設定の有無のみ判定。URL自体はクライアントへ渡さない
  const { data: team } = await supabase
    .from('teams')
    .select('name, webhook_url')
    .eq('id', team_id)
    .single();

  if (!team) redirect('/account');

  return (
    <RecordDetail
      teamId={team_id}
      teamCallName={team.name}
      canDelete={myMembership.role === 'owner'}
      webhookConfigured={!!team.webhook_url}
      postedAt={decomp.posted_at}
      decomp={{
        id: decomp.id,
        task_text: decomp.task_text,
        abilities: decomp.abilities as Ability[],
        created_at: decomp.created_at,
      }}
    />
  );
}
