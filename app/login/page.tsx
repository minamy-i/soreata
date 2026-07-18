'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();

  // ログイン済みなら/accountへ
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      router.push('/account');
    });
  }, [router]);

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
