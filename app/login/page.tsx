'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useSession } from '@/lib/use-session';

export default function LoginPage() {
  const router = useRouter();
  const { session, loading } = useSession();

  // ログイン済みなら/accountへ（確認中はまだ判定しない）
  useEffect(() => {
    if (!loading && session) router.push('/account');
  }, [loading, session, router]);

  async function signIn() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-title">ログイン</div>
        <button className="btn-main" onClick={signIn}>Googleでログイン</button>
      </div>
    </div>
  );
}
