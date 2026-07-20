import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import RecordDetail from "./RecordDetail";
import { requireMember, requireTeam } from "@/lib/require-member";
import type { Ability } from "@/lib/ability";

export default async function RecordPage({
  params,
}: {
  params: Promise<{ team_id: string; recordId: string }>;
}) {
  const { team_id, recordId } = await params;
  const supabase = await createSupabaseServer();

  const { membership: myMembership } = await requireMember(supabase, team_id);

  // AI提案記録の取得
  const { data: decomp } = await supabase
    .from('decompositions')
    .select('id, task_text, abilities, created_at, posted_at')
    .eq('id', recordId)
    .eq('team_id', team_id)
    .single();

  if (!decomp) redirect(`/home/${team_id}`);

  // Webhook設定の有無のみ判定。URL自体はクライアントへ渡さない
  const team = await requireTeam<{ name: string; webhook_url: string | null }>(
    supabase,
    team_id,
    'name, webhook_url'
  );

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
