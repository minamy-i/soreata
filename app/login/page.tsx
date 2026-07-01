'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';

  // ログイン済みなら遷移先へ
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      if (next) {
        router.push(next);
        return;
      }
      const { data: person } = await supabase
        .from('persons')
        .select('id')
        .eq('account_id', data.session.user.id)
        .single();
      if (person) router.push(`/home/${person.id}`);
      else router.push('/');
    });
  }, [router, next]);

  async function signIn() {
    const supabase = createSupabaseBrowser();
    const callbackUrl = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
