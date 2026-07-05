'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

export default function PersonSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/');
        return;
      }

      // 自分のpersonsレコードか確認
      const { data: person } = await supabase
        .from('persons')
        .select('nickname')
        .eq('id', id)
        .eq('account_id', data.session.user.id)
        .single();

      if (!person) {
        router.push('/');
        return;
      }
      setNickname(person.nickname ?? '');
    });
  }, [router, id]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const supabase = createSupabaseBrowser();
      const { error: updateError } = await supabase
        .from('persons')
        .update({ nickname })
        .eq('id', id);
      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-title">当人情報設定</div>

        <div className="form-group">
          <label className="form-label" htmlFor="nickname">当人のニックネーム</label>
          <input
            id="nickname"
            type="text"
            className="form-input"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="当人のニックネームを入力してください"
          />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="action-row">
          <button className="btn-main" onClick={save} disabled={saving}>
            {saved ? '保存しました' : saving ? '保存中...' : '保存する'}
          </button>
          <button className="btn-sub" onClick={() => router.push(`/home/${id}`)}>
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}
