'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/use-session';
import LocationPinIcon from '@/app/components/LocationPinIcon';

export default function GlobalNav() {
  const pathname = usePathname();
  const session = useSession();
  const onAccount = pathname.startsWith('/account');

  return (
    <header className="global-nav">
      <Link href="/" className="global-nav-brand">それ！できて当たり前？</Link>
      <nav className="global-nav-links">
        {session ? (
          <Link
            href="/account"
            className={`global-nav-link${onAccount ? ' global-nav-link--active' : ''}`}
          >
            {onAccount && <LocationPinIcon />}マイページ
          </Link>
        ) : (
          <Link href="/login" className="global-nav-link">Googleでログイン</Link>
        )}
      </nav>
    </header>
  );
}
