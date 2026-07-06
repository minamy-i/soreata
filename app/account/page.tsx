'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { teamDisplayName } from '@/lib/team-display';
import { isTeamEmpty } from '@/lib/team-empty';

// チーム一覧の1行（マイチーム・協力チームを1つの表で統合表示）
// 1ユーザ1チームにつき有効な行は最大1つ（team_membersのユニーク制約）なのでteamIdだけで一意
type TeamRow = {
  teamId: string;
  teamCallName: string; // teams.name（呼び名のみ）
  nickname: string | null;
  relationship: string | null;
  role: 'owner' | 'collaborator';
  isDeletable?: boolean; // owner行のみ判定（協力者0・招待0・記録0）
};

// 来ている招待（自分のメアド宛）
type InvitationRow = {
  id: string;
  teamId: string;
  teamCallName: string;
};

// 編集対象のセル種別
type EditField = 'name' | 'nickname' | 'relationship';

// 表内で今どのセルを編集中か
type Editing = {
  teamId: string;
  field: EditField;
} | null;

export default function AccountPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // セル編集中の状態
  const [editing, setEditing] = useState<Editing>(null);
  const [editValue, setEditValue] = useState('');

  // チーム作成中（空行）の状態
  const [creating, setCreating] = useState(false);
  const [creatingSaving, setCreatingSaving] = useState(false);
  const [newRow, setNewRow] = useState({ name: '', nickname: '', relationship: '' });

  // 招待の参加処理中フラグ（連打防止）
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // チーム削除処理中フラグ（連打防止）
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/');
        return;
      }
      const userId = data.session.user.id;
      const userEmail = data.session.user.email ?? '';
      setEmail(userEmail);
      setUserId(userId);

      // 所属チーム一覧（マイチーム・協力チームを統合）
      const { data: members } = await supabase
        .from('team_members')
        .select('team_id, nickname, relationship, role, teams(name)')
        .eq('account_id', userId)
        .is('revoked_at', null);

      const teamRows: TeamRow[] = (members ?? []).map((m) => {
        const team = m.teams as unknown as { name: string } | null;
        return {
          teamId: m.team_id,
          teamCallName: team?.name ?? '',
          nickname: m.nickname,
          relationship: m.relationship,
          role: m.role,
        };
      });
      setRows(teamRows);

      // 来ている招待
      const { data: invs } = await supabase
        .from('invitations')
        .select('id, team_id, teams(name)')
        .eq('invited_email', userEmail);

      setInvitations(
        (invs ?? []).map((i) => {
          const team = i.teams as unknown as { name: string } | null;
          return {
            id: i.id,
            teamId: i.team_id,
            teamCallName: team?.name ?? '不明',
          };
        })
      );

      // 削除リンクの出現条件（owner行のみ）：協力者0・招待0・記録0
      const ownerRows = teamRows.filter((r) => r.role === 'owner');
      if (ownerRows.length > 0) {
        const deletability = await Promise.all(
          ownerRows.map(async (row) => ({
            teamId: row.teamId,
            isDeletable: await isTeamEmpty(supabase, row.teamId),
          }))
        );
        setRows((rs) =>
          rs.map((r) => {
            const found = deletability.find((d) => d.teamId === r.teamId);
            return found ? { ...r, isDeletable: found.isDeletable } : r;
          })
        );
      }

      setLoading(false);
    });
  }, [router]);

  // ニックネーム・relationshipセルの保存（team_members.自分の行を更新）
  async function saveMemberField(row: TeamRow, field: 'nickname' | 'relationship') {
    setEditing(null);
    const value = editValue.trim();
    const original = row[field] ?? '';
    if (value === original) return;

    const supabase = createSupabaseBrowser();
    const { error: updateError } = await supabase
      .from('team_members')
      .update({ [field]: value || null })
      .eq('team_id', row.teamId)
      .eq('account_id', userId);

    if (updateError) {
      setError('更新に失敗しました');
      return;
    }
    setRows((rs) =>
      rs.map((r) => (r.teamId === row.teamId ? { ...r, [field]: value || null } : r))
    );
  }

  // チーム名（呼び名）セルの保存（teams.nameを更新。owner限定はUIとRLS両方で担保）
  async function saveTeamName(row: TeamRow) {
    setEditing(null);
    const value = editValue.trim();
    if (!value || value === row.teamCallName) return;

    const supabase = createSupabaseBrowser();
    const { error: updateError } = await supabase
      .from('teams')
      .update({ name: value })
      .eq('id', row.teamId);

    if (updateError) {
      setError('チーム名の更新に失敗しました');
      return;
    }
    setRows((rs) => rs.map((r) => (r.teamId === row.teamId ? { ...r, teamCallName: value } : r)));
  }

  // チーム作成（表に追加した空行を確定）
  async function confirmCreate() {
    const callName = newRow.name.trim();
    const nickname = newRow.nickname.trim();
    const relationship = newRow.relationship.trim();
    if (!callName || !nickname || !relationship) return;

    setCreatingSaving(true);
    setError('');
    try {
      const supabase = createSupabaseBrowser();
      // teams作成とteam_members(owner)作成を1トランザクションで行うRPC（docs/schema.sql参照）
      // teams.nameには呼び名のみ保存する（「チーム」前置は表示側で行う。teamDisplayName参照）
      const { data: teamId, error: createError } = await supabase.rpc('create_team_with_owner', {
        team_name: callName,
        owner_nickname: nickname,
        owner_relationship: relationship,
      });
      if (createError || !teamId) throw createError ?? new Error('チーム作成に失敗しました');

      setRows((rs) => [
        ...rs,
        {
          teamId,
          teamCallName: callName,
          nickname,
          relationship,
          role: 'owner',
          isDeletable: true, // 作成直後は協力者・招待・記録すべて0件なので、必ず削除条件を満たす
        },
      ]);
      setCreating(false);
      setNewRow({ name: '', nickname: '', relationship: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チーム作成に失敗しました');
    } finally {
      setCreatingSaving(false);
    }
  }

  // 招待の受諾：team_membersに自分の行を作り、invitationsの該当行を消す
  async function acceptInvitation(inv: InvitationRow) {
    setJoiningId(inv.id);
    setError('');
    try {
      const supabase = createSupabaseBrowser();

      const { error: memberError } = await supabase
        .from('team_members')
        .insert({ team_id: inv.teamId, account_id: userId, role: 'collaborator' });
      if (memberError) throw memberError;

      // 招待は自分宛の行なのでRLS上も自分で削除できる
      await supabase.from('invitations').delete().eq('id', inv.id);

      setRows((rs) => [
        ...rs,
        {
          teamId: inv.teamId,
          teamCallName: inv.teamCallName,
          nickname: null,
          relationship: null,
          role: 'collaborator',
        },
      ]);
      setInvitations((is) => is.filter((i) => i.id !== inv.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加に失敗しました');
    } finally {
      setJoiningId(null);
    }
  }

  // 空チームの即削除（確認ダイアログなし。isDeletable行のみボタンが出るため空チーム前提）
  async function deleteTeam(teamId: string) {
    setDeletingTeamId(teamId);
    setError('');
    const supabase = createSupabaseBrowser();
    const { error: deleteError } = await supabase.from('teams').delete().eq('id', teamId);
    if (deleteError) {
      setError('削除に失敗しました');
      setDeletingTeamId(null);
      return;
    }
    setRows((rs) => rs.filter((r) => r.teamId !== teamId));
    setDeletingTeamId(null);
  }

  async function signOut() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/');
  }

  // セル編集の開始（3種類のセルで共通）
  function startEdit(teamId: string, field: EditField, value: string) {
    setEditing({ teamId, field });
    setEditValue(value);
  }

  // ニックネーム・relationshipセルの表示/編集切り替え
  function renderMemberCell(row: TeamRow, field: 'nickname' | 'relationship') {
    const isEditingThis = editing?.teamId === row.teamId && editing.field === field;
    const value = row[field];

    if (isEditingThis) {
      return (
        <input
          autoFocus
          className="team-cell-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveMemberField(row, field)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setEditValue(value ?? '');
              e.currentTarget.blur();
            }
          }}
        />
      );
    }

    return (
      <span className="team-cell-with-edit">
        <span
          className={value ? 'team-cell-value' : 'team-cell-empty'}
          onClick={() => startEdit(row.teamId, field, value ?? '')}
        >
          {value || '未入力'}
        </span>
        <button className="btn-clear" onClick={() => startEdit(row.teamId, field, value ?? '')}>
          ✎
        </button>
      </span>
    );
  }

  // チーム名セル：owner編集可（編集対象は呼び名のみ）＋空セルが無ければチームページへのリンク
  function renderNameCell(row: TeamRow) {
    const isEditingThis = editing?.teamId === row.teamId && editing.field === 'name';
    const hasEmptyCell = !row.nickname || !row.relationship;
    const displayName = teamDisplayName(row.teamCallName);

    if (isEditingThis) {
      return (
        <input
          autoFocus
          className="team-cell-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveTeamName(row)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setEditValue(row.teamCallName);
              e.currentTarget.blur();
            }
          }}
        />
      );
    }

    return (
      <span className="team-cell-with-edit">
        {hasEmptyCell ? (
          <span className="team-name-disabled">{displayName}</span>
        ) : (
          <Link href={`/home/${row.teamId}`} className="team-name-link">
            {displayName}
          </Link>
        )}
        {row.role === 'owner' && (
          <button
            className="btn-clear"
            onClick={() => startEdit(row.teamId, 'name', row.teamCallName)}
          >
            ✎
          </button>
        )}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <p className="loading">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="form-group">
          <span className="form-label">メールアドレス</span>
          <p className="form-value">{email}</p>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        <div className="card-title">チーム一覧</div>
        {rows.length === 0 && !creating && (
          <p className="empty-note">まだどのチームにも参加していません</p>
        )}
        {rows.some((r) => !r.nickname || !r.relationship) && (
          <p className="empty-note">未入力の項目があります。必ず入力してください</p>
        )}
        {rows.length > 0 && (
          <p className="empty-note">チーム名をクリックすると、チームのホームに行きます</p>
        )}
        {(rows.length > 0 || creating) && (
          <div className="team-table-wrap">
            <table className="team-table">
              <thead>
                <tr>
                  <th>チーム名</th>
                  <th>ニックネーム</th>
                  <th>関係</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.teamId}>
                    <td>{renderNameCell(row)}</td>
                    <td>{renderMemberCell(row, 'nickname')}</td>
                    <td>{renderMemberCell(row, 'relationship')}</td>
                    <td>
                      {row.role === 'owner' && row.isDeletable && (
                        <button
                          className="team-delete-link"
                          onClick={() => deleteTeam(row.teamId)}
                          disabled={deletingTeamId === row.teamId}
                        >
                          {deletingTeamId === row.teamId ? '削除中...' : '削除'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {creating && (
                  <tr>
                    <td>
                      <input
                        autoFocus
                        className="team-cell-input"
                        placeholder="呼び名（例：太郎）"
                        value={newRow.name}
                        onChange={(e) => setNewRow((n) => ({ ...n, name: e.target.value }))}
                      />
                    </td>
                    <td>
                      <input
                        className="team-cell-input"
                        placeholder="ニックネーム"
                        value={newRow.nickname}
                        onChange={(e) => setNewRow((n) => ({ ...n, nickname: e.target.value }))}
                      />
                    </td>
                    <td>
                      <input
                        className="team-cell-input"
                        placeholder="関係"
                        value={newRow.relationship}
                        onChange={(e) =>
                          setNewRow((n) => ({ ...n, relationship: e.target.value }))
                        }
                      />
                    </td>
                    <td className="team-row-actions">
                      <button
                        className="btn-sub btn-save"
                        onClick={confirmCreate}
                        disabled={
                          creatingSaving ||
                          !newRow.name.trim() ||
                          !newRow.nickname.trim() ||
                          !newRow.relationship.trim()
                        }
                      >
                        確定
                      </button>
                      <button
                        className="btn-clear"
                        onClick={() => {
                          setCreating(false);
                          setNewRow({ name: '', nickname: '', relationship: '' });
                        }}
                      >
                        取消
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!creating && (
          <div className="action-row">
            <button className="btn-sub" onClick={() => setCreating(true)}>
              チームを作成する
            </button>
          </div>
        )}
      </div>

      {invitations.length > 0 && (
        <div className="card">
          <div className="card-title">来ている招待</div>
          <ul className="record-list">
            {invitations.map((inv) => (
              <li key={inv.id}>
                <span className="record-item">
                  <span className="record-task">{teamDisplayName(inv.teamCallName)}から招待</span>
                  <button
                    className="btn-main btn-save"
                    onClick={() => acceptInvitation(inv)}
                    disabled={joiningId === inv.id}
                  >
                    {joiningId === inv.id ? '参加中...' : '参加'}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 && (
        <div className="card">
          {/* 実処理は次タスク（アカウント削除実装）。今回は表示条件のみ */}
          <button className="btn-danger" onClick={() => {}}>
            アカウントを削除する
          </button>
        </div>
      )}

      <div className="card">
        <button className="btn-sub" onClick={signOut}>
          ログアウト
        </button>
      </div>
    </div>
  );
}
