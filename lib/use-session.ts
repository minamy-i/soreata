'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import type { Session } from '@supabase/supabase-js';

// ログインセッションの取得・監視。ナビ・AI提案画面など複数箇所で使う共通フック。
// loadingは「初回確認が終わったか」を表す。session===nullは「未確認」と「未ログイン」の
// 両方であり得るため、リダイレクト判定に使う場合はloadingが終わるまで待つ必要がある
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}
