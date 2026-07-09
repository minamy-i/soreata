'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/use-session';

export default function GlobalNav() {
  const pathname = usePathname();
  const session = useSession();

  function navClass(pattern: 'account') {
    const active = pattern === 'account' && pathname.startsWith('/account');
    return `global-nav-link${active ? ' global-nav-link--active' : ''}`;
  }

  return (
    <header className="global-nav">
      <Link href="/" className="global-nav-brand">それ！できて当たり前？</Link>
      <nav className="global-nav-links">
        {session ? (
          <Link href="/account" className={navClass('account')}>
            <span className="nav-label-full">チーム一覧</span>
            <span className="nav-label-short">チーム</span>
          </Link>
        ) : (
          <Link href="/login" className="global-nav-link">Googleでログイン</Link>
        )}
      </nav>
    </header>
  );
}
