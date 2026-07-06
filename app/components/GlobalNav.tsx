'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import type { Session } from '@supabase/supabase-js';

export default function GlobalNav() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

  function navClass(pattern: 'top' | 'account') {
    const active =
      pattern === 'top' ? pathname === '/' :
      pathname.startsWith('/account');
    return `global-nav-link${active ? ' global-nav-link--active' : ''}`;
  }

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

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
            <Link href="/account" className={navClass('account')}>
              <span className="nav-label-full">チーム一覧</span>
              <span className="nav-label-short">チーム</span>
            </Link>
          </>
        ) : (
          <Link href="/login" className="global-nav-link">ログイン</Link>
        )}
      </nav>
    </header>
  );
}
