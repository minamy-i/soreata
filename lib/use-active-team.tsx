'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useSession } from '@/lib/use-session';
import { teamNameOf } from '@/lib/team-display';

export type SaveCandidate = {
  teamId: string;
  teamCallName: string;
};

type ActiveTeamState = {
  saveCandidates: SaveCandidate[];
  activeTeam: SaveCandidate | undefined;
};

const ActiveTeamContext = createContext<ActiveTeamState>({ saveCandidates: [], activeTeam: undefined });

// チームホーム経由（/?team=...）でチームが確定している場合のみ、そのチーム名を返す。
// 「チーム確定」の判定はAI分解画面（/）でも、ナビのチーム名表示でも同じ条件を使うため共通化した。
// フェッチ自体はこのProviderに1本化する（GlobalNav・AI分解画面それぞれがフックを呼ぶ方式だと、
// /ページで同じクエリが2回走ってしまうため。app/layout.tsxで全体をラップする）
export function ActiveTeamProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = useSession();
  const [saveCandidates, setSaveCandidates] = useState<SaveCandidate[]>([]);
  const teamId = pathname === '/' ? searchParams.get('team') : null;

  // 保存先候補（自分の行のnickname・relationshipが両方埋まっているチームのみ）を取得
  useEffect(() => {
    if (!session || pathname !== '/') {
      setSaveCandidates([]);
      return;
    }
    const supabase = createSupabaseBrowser();
    supabase
      .from('team_members')
      .select('team_id, teams(name)')
      .eq('account_id', session.user.id)
      .is('revoked_at', null)
      .not('nickname', 'is', null)
      .not('relationship', 'is', null)
      .then(({ data }) => {
        const candidates: SaveCandidate[] = (data ?? []).map((m) => ({
          teamId: m.team_id,
          teamCallName: teamNameOf(m.teams) ?? '',
        }));
        setSaveCandidates(candidates);
      });
  }, [session, pathname]);

  const activeTeam = saveCandidates.find((c) => c.teamId === teamId);

  return (
    <ActiveTeamContext.Provider value={{ saveCandidates, activeTeam }}>
      {children}
    </ActiveTeamContext.Provider>
  );
}

export function useActiveTeam(): ActiveTeamState {
  return useContext(ActiveTeamContext);
}
