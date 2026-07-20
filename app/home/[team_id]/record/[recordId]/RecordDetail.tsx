'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import AccordionList from '@/app/components/AccordionList';
import ConfirmBox from '@/app/components/ConfirmBox';
import LocationPinIcon from '@/app/components/LocationPinIcon';
import { teamDisplayName } from '@/lib/team-display';
import type { Ability } from '@/lib/ability';

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);
  const [lastPostedAt, setLastPostedAt] = useState(postedAt);
  const [postError, setPostError] = useState('');
  const [confirmPost, setConfirmPost] = useState(false);

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
        <p className="page-title"><LocationPinIcon />{teamDisplayName(teamCallName)}の記録詳細</p>
        <Link href={`/home/${teamId}`} className="text-link">このチームのホームへ</Link>
      </div>

      <div className="card">
        <div className="card-title">困りごと</div>
        <p className="record-meta-date">保存日：{savedDate}</p>
        <p className="record-task-text">{decomp.task_text}</p>

        <div className="card-section">
          <div className="card-title">能力一覧</div>
          <AccordionList
            abilities={abilities}
            renderExtra={(ability, i) => (
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
            )}
          />
          {error && <div className="error-msg">{error}</div>}
        </div>

        {(webhookConfigured || canDelete) && (
          <div className="card-section">
            {/* 投稿・削除どちらも未確認中のときだけ、トリガーボタンを横並びで表示する。
                どちらかを押すと、そのボタンだけがConfirmBoxに切り替わる（排他表示）。
                記録全体（困りごと＋能力一覧）への操作のため、最後尾に置く */}
            {!confirmPost && !confirmDelete && (
              <div className="action-row">
                {webhookConfigured && (
                  <button className="btn-sub" onClick={handlePostClick} disabled={posting}>
                    {posting ? '投稿中...' : '外部ツールへ投稿'}
                  </button>
                )}
                {lastPostedAt && (
                  <span className="webhook-posted-note">
                    前回投稿：{new Date(lastPostedAt).toLocaleDateString('ja-JP')}
                  </span>
                )}
                {canDelete && (
                  <button className="btn-danger push-right" onClick={() => setConfirmDelete(true)}>
                    この記録を削除する
                  </button>
                )}
              </div>
            )}

            {confirmPost && (
              <ConfirmBox
                message="前回投稿済みです。もう一度投稿しますか？"
                confirmLabel="投稿する"
                busyLabel="投稿中..."
                busy={posting}
                confirmClass="btn-sub"
                onConfirm={postWebhook}
                onCancel={() => setConfirmPost(false)}
              />
            )}
            {postError && !confirmDelete && <div className="error-msg">{postError}</div>}

            {confirmDelete && (
              <ConfirmBox
                message="本当に削除しますか？この操作は取り消せません。"
                confirmLabel="削除する"
                busyLabel="削除中..."
                busy={deleting}
                confirmClass="btn-danger"
                onConfirm={deleteRecord}
                onCancel={() => setConfirmDelete(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
