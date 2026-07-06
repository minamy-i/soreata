'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { teamDisplayName } from '@/lib/team-display';
import type { Ability } from './page';

type Decomp = {
  id: string;
  task_text: string;
  abilities: Ability[];
  created_at: string;
};

export default function RecordDetail({
  teamId,
  teamCallName,
  canDelete,
  webhookConfigured,
  postedAt,
  decomp,
}: {
  teamId: string;
  teamCallName: string;
  canDelete: boolean;
  webhookConfigured: boolean;
  postedAt: string | null;
  decomp: Decomp;
}) {
  const router = useRouter();
  const [abilities, setAbilities] = useState<Ability[]>(decomp.abilities);
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);
  const [lastPostedAt, setLastPostedAt] = useState(postedAt);
  const [postError, setPostError] = useState('');
  const [confirmPost, setConfirmPost] = useState(false);

  function toggleAccordion(index: number) {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const savedDate = new Date(decomp.created_at).toLocaleDateString('ja-JP');

  async function updateConfirmedAt(index: number, value: string | null) {
    const updated = abilities.map((a, i) =>
      i === index ? { ...a, confirmed_at: value } : a
    );
    setAbilities(updated);

    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from('decompositions')
      .update({ abilities: updated })
      .eq('id', decomp.id);
    if (error) setError('確認日の保存に失敗しました');
  }

  // 初回投稿はワンクリック、再投稿（前回投稿日時あり）は確認を挟んで誤操作を防ぐ
  function handlePostClick() {
    if (lastPostedAt) {
      setConfirmPost(true);
    } else {
      postWebhook();
    }
  }

  async function postWebhook() {
    setPosting(true);
    setPostError('');
    try {
      const res = await fetch('/api/post-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, recordId: decomp.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '投稿に失敗しました');
      setLastPostedAt(data.postedAt);
      setConfirmPost(false);
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setPosting(false);
    }
  }

  async function deleteRecord() {
    setDeleting(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from('decompositions')
      .delete()
      .eq('id', decomp.id);
    if (error) {
      setError('削除に失敗しました');
      setDeleting(false);
    } else {
      router.push(`/home/${teamId}`);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <p className="page-title">{teamDisplayName(teamCallName)}の記録詳細</p>
        <Link href={`/home/${teamId}`} className="btn-sub">ホームへ戻る</Link>
      </div>

      <div className="card">
        <p className="record-meta-date">保存日：{savedDate}</p>
        <p className="record-task-text">{decomp.task_text}</p>
      </div>

      <div className="card">
        <div className="card-title">能力一覧</div>
        <ul className="ability-list">
          {abilities.map((ability, i) => (
            <li key={i} className="accordion-item">
              <button
                className="accordion-header"
                onClick={() => toggleAccordion(i)}
              >
                <span className="accordion-square">◻︎</span>
                <span className="accordion-title">{ability.title}</span>
                <div className="confirmed-field" onClick={e => e.stopPropagation()}>
                  <span className="confirmed-label">確認日</span>
                  <input
                    type="date"
                    className="date-input"
                    value={ability.confirmed_at ?? ''}
                    onChange={e => updateConfirmedAt(i, e.target.value || null)}
                  />
                  {ability.confirmed_at && (
                    <button
                      className="btn-clear"
                      onClick={() => updateConfirmedAt(i, null)}
                      title="未確認に戻す"
                    >
                      ×
                    </button>
                  )}
                </div>
                <span className={`accordion-icon${openItems.has(i) ? ' open' : ''}`}>▼</span>
              </button>
              {openItems.has(i) && (
                <div className="accordion-body">
                  <div className="ability-description">
                    {ability.description.split('\n').map((line, j) => (
                      <span key={j}>{line}<br /></span>
                    ))}
                  </div>
                  <span className="person-line">当人は？ {ability.person}</span>
                  <div className="ability-solution"><strong>対応：</strong>{ability.solution}</div>
                </div>
              )}
            </li>
          ))}
        </ul>
        {error && <div className="error-msg">{error}</div>}
      </div>

      {webhookConfigured && (
        <div className="card">
          {!confirmPost ? (
            <div className="action-row">
              <button className="btn-sub" onClick={handlePostClick} disabled={posting}>
                {posting ? '投稿中...' : '外部ツールへ投稿'}
              </button>
              {lastPostedAt && (
                <span className="webhook-posted-note">
                  前回投稿：{new Date(lastPostedAt).toLocaleString('ja-JP')}
                </span>
              )}
            </div>
          ) : (
            <div className="confirm-box">
              <p className="confirm-msg">前回投稿済みです。もう一度投稿しますか？</p>
              <div className="action-row">
                <button className="btn-sub" onClick={postWebhook} disabled={posting}>
                  {posting ? '投稿中...' : '投稿する'}
                </button>
                <button className="btn-sub" onClick={() => setConfirmPost(false)}>
                  キャンセル
                </button>
              </div>
            </div>
          )}
          {postError && <div className="error-msg">{postError}</div>}
        </div>
      )}

      {canDelete && (
        <div className="card">
          {!confirmDelete ? (
            <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
              この記録を削除する
            </button>
          ) : (
            <div className="confirm-box">
              <p className="confirm-msg">本当に削除しますか？この操作は取り消せません。</p>
              <div className="action-row">
                <button className="btn-danger" onClick={deleteRecord} disabled={deleting}>
                  {deleting ? '削除中...' : '削除する'}
                </button>
                <button className="btn-sub" onClick={() => setConfirmDelete(false)}>
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
