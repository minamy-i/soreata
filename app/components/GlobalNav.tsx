'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import type { Session } from '@supabase/supabase-js';

export default function GlobalNav() {
  const [session, setSession] = useState<Session | null>(null);
  const [personId, setPersonId] = useState('');

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ログイン済みのとき person.id を取得（ダッシュボードリンク用）
  useEffect(() => {
    if (!session) { setPersonId(''); return; }
    const supabase = createSupabaseBrowser();
    supabase
      .from('persons')
      .select('id')
      .eq('account_id', session.user.id)
      .single()
      .then(({ data }) => { if (data) setPersonId(data.id); });
  }, [session]);

  return (
    <header className="global-nav">
      <Link href="/" className="global-nav-brand">それ！できて当たり前？</Link>
      <nav className="global-nav-links">
        {session ? (
          <>
            <Link href="/" className="global-nav-link">AI分析</Link>
            {personId && (
              <Link href={`/home/${personId}`} className="global-nav-link">ダッシュボード</Link>
            )}
            <Link href="/account/settings" className="global-nav-link">アカウント設定</Link>
          </>
        ) : (
          <Link href="/login" className="global-nav-link">ログイン</Link>
        )}
      </nav>
    </header>
  );
}
