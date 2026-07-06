import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { isTeamEmpty } from "@/lib/team-empty";
import SettingsForm from "./SettingsForm";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ team_id: string }>;
}) {
  const { team_id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect(`/login?next=/home/${team_id}/settings`);

  // 自分の所属確認（当人権限者、またはWebhook管理を委譲された協力者のみ入れる）
  const { data: myMembership } = await supabase
    .from('team_members')
    .select('role, can_manage_webhook')
    .eq('team_id', team_id)
    .eq('account_id', session.user.id)
    .is('revoked_at', null)
    .single();

  const isOwner = myMembership?.role === 'owner';
  const canManageWebhook = isOwner || myMembership?.can_manage_webhook === true;

  if (!myMembership || !canManageWebhook) {
    redirect(`/home/${team_id}`);
  }

  const { data: team } = await supabase
    .from('teams')
    .select('name, webhook_url, webhook_platform')
    .eq('id', team_id)
    .single();

  if (!team) redirect('/account');

  // チーム削除セクションの表示切り替え（owner限定機能。空チームのみ即削除できる）
  const isEmpty = isOwner ? await isTeamEmpty(supabase, team_id) : false;

  return (
    <SettingsForm
      teamId={team_id}
      teamCallName={team.name}
      webhookUrl={team.webhook_url}
      webhookPlatform={team.webhook_platform}
      isOwner={isOwner}
      isEmpty={isEmpty}
    />
  );
}
