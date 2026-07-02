'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import type { Session } from '@supabase/supabase-js';

export default function GlobalNav() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [personId, setPersonId] = useState('');

  function navClass(pattern: 'top' | 'home' | 'account') {
    const active =
      pattern === 'top' ? pathname === '/' :
      pattern === 'home' ? pathname.startsWith('/home/') :
      pathname.startsWith('/account/');
    return `global-nav-link${active ? ' global-nav-link--active' : ''}`;
  }

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
            <Link href="/" className={navClass('top')}>
              <span className="nav-label-full">困りごとのAI分解</span>
              <span className="nav-label-short">AI分解</span>
            </Link>
            {personId && (
              <Link href={`/home/${personId}`} className={navClass('home')}>
                <span className="nav-label-full">ダッシュボード</span>
                <span className="nav-label-short">記録</span>
              </Link>
            )}
            <Link href="/account/settings" className={navClass('account')}>
              <span className="nav-label-full">アカウント設定</span>
              <span className="nav-label-short">設定</span>
            </Link>
          </>
        ) : (
          <Link href="/login" className="global-nav-link">ログイン</Link>
        )}
      </nav>
    </header>
  );
}
