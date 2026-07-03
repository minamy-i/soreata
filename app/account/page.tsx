'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { COLLABORATORS_SAMPLE } from '@/data/collaborators_sample';

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirst = searchParams.get('first') === '1';

  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [personId, setPersonId] = useState('');
  const [personNickname, setPersonNickname] = useState('');
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

      const { data: person } = await supabase
        .from('persons')
        .select('id, nickname')
        .eq('account_id', userId)
        .single();
      if (person) {
        setPersonId(person.id);
        setPersonNickname(person.nickname ?? '');
      }
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

      {/* マイチーム（当人として） */}
      {personId && (
        <div className="card">
          <div className="card-title">マイチーム</div>
          <Link href={`/home/${personId}`} className="record-item">
            <span className="record-task">{personNickname || '（名前未設定）'}</span>
          </Link>
        </div>
      )}

      {/* 協力チーム一覧（協力者として）※サンプルデータ */}
      <div className="card">
        <div className="card-title">協力チーム</div>
        <ul className="record-list">
          {COLLABORATORS_SAMPLE.map((c, i) => (
            <li key={i}>
              <span className="record-item">
                <span className="record-task">{c.nickname}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <button className="btn-sub" onClick={signOut}>ログアウト</button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense>
      <AccountContent />
    </Suspense>
  );
}
