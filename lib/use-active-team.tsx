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
// 現在の利用元はAI提案画面（/）のみ。app/layout.tsxでアプリ全体をラップしているのは、
// 将来ナビ等の別コンポーネントからも同じ判定が必要になった場合に、クエリを2重に発行させないため
export function ActiveTeamProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session } = useSession();
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
