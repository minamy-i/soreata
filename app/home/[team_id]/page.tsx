import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { teamDisplayName } from "@/lib/team-display";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ team_id: string }>;
}) {
  const { team_id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect(`/login?next=/home/${team_id}`);

  // 自分の所属確認（非メンバー・空セルが残っている場合は/accountへ）
  const { data: myMembership } = await supabase
    .from('team_members')
    .select('nickname, relationship, role, can_manage_webhook')
    .eq('team_id', team_id)
    .eq('account_id', session.user.id)
    .is('revoked_at', null)
    .single();

  if (!myMembership || !myMembership.nickname || !myMembership.relationship) {
    redirect('/account');
  }

  const { data: team } = await supabase
    .from('teams')
    .select('name')
    .eq('id', team_id)
    .single();

  if (!team) redirect('/account');

  // メンバー一覧（閲覧専用）
  const { data: members } = await supabase
    .from('team_members')
    .select('nickname, relationship, role')
    .eq('team_id', team_id)
    .is('revoked_at', null);

  // AI分解記録を新しい順に取得
  const { data: decompositions } = await supabase
    .from('decompositions')
    .select('id, task_text, created_at')
    .eq('team_id', team_id)
    .order('created_at', { ascending: false });

  const canSeeSettings = myMembership.role === 'owner' || myMembership.can_manage_webhook;

  return (
    <div className="container">
      <div className="page-header">
        <p className="page-title">{teamDisplayName(team.name)}のホーム</p>
        {canSeeSettings && (
          <Link href={`/home/${team_id}/settings`} className="btn-sub">
            チーム設定
          </Link>
        )}
      </div>
      <p className="record-meta-date">
        あなたの表示：{myMembership.nickname}（{myMembership.relationship}）
      </p>

      <div className="card">
        <div className="card-title">メンバー一覧</div>
        <ul className="record-list">
          {(members ?? []).map((m, i) => {
            // 招待受諾直後はnickname・relationshipが未入力（/accountで入力するまでの一時状態）
            const isPending = !m.nickname || !m.relationship;
            return (
              <li key={i}>
                <span className={`record-item${m.role === 'owner' ? ' record-item-owner' : ''}`}>
                  <span className="record-task">
                    {isPending ? '協力者入室待ち' : m.nickname}
                  </span>
                  <span className="record-date">
                    {isPending ? '' : `${m.relationship}・${m.role === 'owner' ? '当人権限者' : '協力者'}`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card">
        <div className="card-title">AI分解の記録</div>
        {!decompositions || decompositions.length === 0 ? (
          <p className="empty-note">分解して保存してみましょう</p>
        ) : (
          <>
            <p className="empty-note">記録をクリックすると詳細が見られます</p>
            <ul className="record-list">
              {decompositions.map((d) => (
                <li key={d.id}>
                  <Link href={`/home/${team_id}/record/${d.id}`} className="record-item">
                    <span className="record-date">
                      {new Date(d.created_at).toLocaleDateString('ja-JP')}
                    </span>
                    <span className="record-task">{d.task_text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

    </div>
  );
}
