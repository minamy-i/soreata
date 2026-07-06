'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { teamDisplayName } from '@/lib/team-display';

type WebhookPlatform = 'slack' | 'discord';

export default function SettingsForm({
  teamId,
  teamCallName,
  webhookUrl,
  webhookPlatform,
  isOwner,
  isEmpty,
}: {
  teamId: string;
  teamCallName: string;
  webhookUrl: string | null;
  webhookPlatform: WebhookPlatform | null;
  isOwner: boolean;
  isEmpty: boolean;
}) {
  const router = useRouter();

  const [url, setUrl] = useState(webhookUrl ?? '');
  const [platform, setPlatform] = useState<WebhookPlatform>(webhookPlatform ?? 'slack');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

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

  // 空チームの即削除（確認ダイアログなし。中身があるチームはボタン自体を出さない）
  async function deleteEmptyTeam() {
    setDeleting(true);
    setError('');
    const supabase = createSupabaseBrowser();
    const { error: deleteError } = await supabase.from('teams').delete().eq('id', teamId);
    if (deleteError) {
      setError('削除に失敗しました');
      setDeleting(false);
      return;
    }
    router.push('/account');
  }

  return (
    <div className="container">
      <p className="page-title">{teamDisplayName(teamCallName)}の設定</p>

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
            {saved ? '保存しました' : saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>

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

      <div className="action-row">
        <button className="btn-sub" onClick={() => router.push(`/home/${teamId}`)}>
          戻る
        </button>
      </div>
    </div>
  );
}
