'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import type { Ability } from './page';

type Decomp = {
  id: string;
  task_text: string;
  abilities: Ability[];
  created_at: string;
};

export default function RecordDetail({
  personId,
  decomp,
}: {
  personId: string;
  decomp: Decomp;
}) {
  const router = useRouter();
  const [abilities, setAbilities] = useState<Ability[]>(decomp.abilities);
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

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
      router.push(`/home/${personId}`);
    }
  }

  return (
    <div className="container">
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

      <div className="card">
        {!confirmDelete ? (
          <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
            この記録を削除する
          </button>
        ) : (
          <div className="delete-confirm">
            <p className="delete-confirm-msg">本当に削除しますか？この操作は取り消せません。</p>
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
    </div>
  );
}
