import { createSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import { teamDisplayName } from "@/lib/team-display";
import { requireMember, requireTeam } from "@/lib/require-member";
import LocationPinIcon from "@/app/components/LocationPinIcon";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ team_id: string }>;
}) {
  const { team_id } = await params;
  const supabase = await createSupabaseServer();

  const { membership: myMembership } = await requireMember(supabase, team_id);
  const team = await requireTeam<{ name: string }>(supabase, team_id, 'name');

  // メンバー一覧（閲覧専用）
  const { data: members } = await supabase
    .from('team_members')
    .select('nickname, relationship, role')
    .eq('team_id', team_id)
    .is('revoked_at', null);

  // AI提案記録を新しい順に取得
  const { data: decompositions } = await supabase
    .from('decompositions')
    .select('id, task_text, created_at')
    .eq('team_id', team_id)
    .order('created_at', { ascending: false });

  const canSeeSettings = myMembership.role === 'owner' || myMembership.can_manage_webhook;

  return (
    <div className="container">
      <div className="page-header">
        <p className="page-title"><LocationPinIcon />{teamDisplayName(team.name)}のホーム</p>
        {canSeeSettings && (
          <Link href={`/home/${team_id}/settings`} className="text-link">
            このチームの設定
          </Link>
        )}
      </div>
      <div className="card">
        <div className="card-title">メンバー</div>
        <p className="record-meta-date">
          あなたの表示：{myMembership.nickname}（{myMembership.relationship}）
        </p>
        <ul className="record-list member-list">
          {(members ?? []).map((m, i) => {
            // 招待受諾直後はnickname・relationshipが未入力（/accountで入力するまでの一時状態）
            const isPending = !m.nickname || !m.relationship;
            return (
              <li key={i}>
                <span className={`member-row${m.role === 'owner' ? ' member-row-owner' : ''}`}>
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
        <div className="card-title">
          AI提案の記録
          <Link href={`/?team=${team_id}`} className="text-link push-right">
            AI提案へ
          </Link>
        </div>
        {!decompositions || decompositions.length === 0 ? (
          <p className="empty-note">AIに聞いて保存してみましょう</p>
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
