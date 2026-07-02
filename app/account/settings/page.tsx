'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

function AccountSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirst = searchParams.get('first') === '1';

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
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
      const userId = data.session.user.id;
      setEmail(data.session.user.email ?? '');

      const { data: account } = await supabase
        .from('accounts')
        .select('nickname')
        .eq('id', userId)
        .single();
      if (account) setNickname(account.nickname ?? '');
    });
  }, [router]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const supabase = createSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('ログインしてください');

      const { error: updateError } = await supabase
        .from('accounts')
        .update({ nickname })
        .eq('id', session.user.id);
      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <div className="container">
      {isFirst && (
        <div className="card">
          <p className="info-note">ニックネームを設定しましょう</p>
        </div>
      )}

      <div className="card">
        <div className="form-group">
          <span className="form-label">メールアドレス</span>
          <p className="form-value">{email}</p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="nickname">ニックネーム</label>
          <input
            id="nickname"
            type="text"
            className="form-input"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="ニックネームを入力してください"
          />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="action-row">
          <button className="btn-main" onClick={save} disabled={saving}>
            {saved ? '保存しました' : saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>

      <div className="card">
        <button className="btn-sub" onClick={signOut}>ログアウト</button>
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense>
      <AccountSettingsContent />
    </Suspense>
  );
}
