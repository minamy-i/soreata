'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { teamDisplayName } from '@/lib/team-display';
import { deleteTeamById } from '@/lib/team-delete';

type WebhookPlatform = 'slack' | 'discord';
type Invitation = { id: string; invited_email: string };

export default function SettingsForm({
  teamId,
  teamCallName,
  webhookUrl,
  webhookPlatform,
  isOwner,
  isEmpty,
  invitations,
}: {
  teamId: string;
  teamCallName: string;
  webhookUrl: string | null;
  webhookPlatform: WebhookPlatform | null;
  isOwner: boolean;
  isEmpty: boolean;
  invitations: Invitation[];
}) {
  const router = useRouter();

  const [url, setUrl] = useState(webhookUrl ?? '');
  const [platform, setPlatform] = useState<WebhookPlatform>(webhookPlatform ?? 'slack');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const [pendingInvitations, setPendingInvitations] = useState(invitations);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // Webhook設定の保存（URL空欄で連携解除。対応先はURLがある時だけ意味を持つ）
  async function saveWebhook() {
    setSaving(true);
    setError('');
    try {
      const trimmedUrl = url.trim();
      const supabase = createSupabaseBrowser();
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          webhook_url: trimmedUrl || null,
          webhook_platform: trimmedUrl ? platform : null,
        })
        .eq('id', teamId);
      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Webhook設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  // 協力者の招待（登録済みメアドのみ。実在確認はAPI側でservice-roleキーを使って行う）
  async function sendInvitation() {
    setInviting(true);
    setInviteError('');
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || '招待の作成に失敗しました');
        return;
      }
      setPendingInvitations((prev) => [...prev, data.invitation]);
      setInviteEmail('');
    } catch {
      setInviteError('通信エラーが発生しました');
    } finally {
      setInviting(false);
    }
  }

  // 招待の取り消し（RLSでowner本人のdeleteが許可されているためAPI不要）
  async function cancelInvitation(id: string) {
    setCancelingId(id);
    const supabase = createSupabaseBrowser();
    const { error: deleteError } = await supabase.from('invitations').delete().eq('id', id);
    if (deleteError) {
      setInviteError('取り消しに失敗しました');
      setCancelingId(null);
      return;
    }
    setPendingInvitations((prev) => prev.filter((invitation) => invitation.id !== id));
    setCancelingId(null);
  }

  // 空チームの即削除（確認ダイアログなし。中身があるチームはボタン自体を出さない）
  async function deleteEmptyTeam() {
    setDeleting(true);
    setError('');
    const supabase = createSupabaseBrowser();
    const { error: deleteError } = await deleteTeamById(supabase, teamId);
    if (deleteError) {
      setError('削除に失敗しました');
      setDeleting(false);
      return;
    }
    router.push('/account');
  }

  return (
    <div className="container">
      <div className="page-header">
        <p className="page-title">{teamDisplayName(teamCallName)}の設定</p>
        <Link href={`/home/${teamId}`} className="text-link">このチームのホームへ</Link>
      </div>

      <div className="card">
        <div className="card-title">外部ツールへの投稿設定</div>
        <div className="form-group">
          <label className="form-label" htmlFor="webhook-url">Webhook URL</label>
          <input
            id="webhook-url"
            type="text"
            className="form-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="未設定（投稿ボタンは表示されません）"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="webhook-platform">投稿先</label>
          <select
            id="webhook-platform"
            className="form-input"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as WebhookPlatform)}
          >
            <option value="slack">Slack</option>
            <option value="discord">Discord</option>
          </select>
        </div>
        <div className="action-row">
          <button className="btn-main" onClick={saveWebhook} disabled={saving}>
            {saved ? '設定しました' : saving ? '保存中...' : '設定する'}
          </button>
        </div>
      </div>

      {isOwner && (
        <div className="card">
          <div className="card-title">協力者の招待</div>
          <p className="empty-note">登録済みのメールアドレスで招待できます。</p>
          <div className="form-group">
            <label className="form-label" htmlFor="invite-email">メールアドレス</label>
            <input
              id="invite-email"
              type="email"
              className="form-input"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="collaborator@example.com"
            />
          </div>
          <div className="action-row">
            <button className="btn-main" onClick={sendInvitation} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? '送信中...' : '招待する'}
            </button>
          </div>
          {inviteError && <div className="error-msg">{inviteError}</div>}

          {pendingInvitations.length > 0 && (
            <>
              <div className="card-title">招待中一覧</div>
              <ul className="record-list">
                {pendingInvitations.map((invitation) => (
                  <li key={invitation.id}>
                    <span className="record-item invitation-row">
                      <span className="record-task">{invitation.invited_email}</span>
                      <button
                        className="btn-sub"
                        onClick={() => cancelInvitation(invitation.id)}
                        disabled={cancelingId === invitation.id}
                      >
                        {cancelingId === invitation.id ? '取り消し中...' : '取り消す'}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {isOwner && (
        <div className="card">
          <div className="card-title">チームの削除</div>
          {isEmpty ? (
            <button className="btn-danger" onClick={deleteEmptyTeam} disabled={deleting}>
              {deleting ? '削除中...' : 'このチームを削除する'}
            </button>
          ) : (
            <p className="empty-note">記録・協力者があるため削除できません（準備中）</p>
          )}
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}
    </div>
  );
}
