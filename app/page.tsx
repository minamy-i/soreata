'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { teamDisplayName } from '@/lib/team-display';
import { buildRecordText } from '@/lib/record-text';
import type { Session } from '@supabase/supabase-js';

// 保存先候補（自分の行に空セルが無いチーム）
type SaveCandidate = {
  teamId: string;
  teamCallName: string;
};

type Ability = {
  title: string;
  description: string;
  person: string;
  solution: string;
  confirmed_at: null;
};

const EXAMPLE_TASKS = [
  '走り回る2歳児を紙芝居へ注目させる',
  '小学校低学年の子が「太郎くんのうしろに並んで」の指示がわからない',
  '中学生の体育祭の「大玉送り」で、相手チームの邪魔に行かないようにする',
  '大学での試験会場が講義室と違う場合があると知らなかった',
  '既に何年も勤めている会社で新しい仕事の手順を覚えるのに時間がかかる',
];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [session, setSession] = useState<Session | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [saveCandidates, setSaveCandidates] = useState<SaveCandidate[]>([]);
  const [confirmSave, setConfirmSave] = useState(false);
  const [showTeamSelect, setShowTeamSelect] = useState(false);
  const router = useRouter();

  // セッション取得・監視
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // 保存先候補（自分の行のnickname・relationshipが両方埋まっているチームのみ）を取得
  useEffect(() => {
    if (!session) {
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
        const candidates: SaveCandidate[] = (data ?? []).map((m) => {
          const team = m.teams as unknown as { name: string } | null;
          return { teamId: m.team_id, teamCallName: team?.name ?? '' };
        });
        setSaveCandidates(candidates);
      });
  }, [session]);

  // キャンバス背景の描画
  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      const colors = [
        'rgba(230,40,40,0.70)',
        'rgba(20,180,175,0.85)',
        'rgba(250,210,0,0.75)',
        'rgba(220,40,140,0.68)',
        'rgba(40,190,80,0.68)',
        'rgba(200,40,200,0.62)',
        'rgba(110,60,230,0.65)',
        'rgba(20,140,240,0.68)',
      ];
      const rand = (min: number, max: number) => Math.random() * (max - min) + min;
      const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

      for (let i = 0; i < 180; i++) {
        const x = rand(0, W);
        const y = rand(0, H);
        const color = pick(colors);
        const shape = Math.floor(rand(0, 5));

        ctx.globalAlpha = Math.min(1, y / 280);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rand(0, Math.PI * 2));

        switch (shape) {
          case 0:
            ctx.beginPath();
            ctx.arc(0, 0, rand(18, 48), 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            break;
          case 1:
            ctx.beginPath();
            ctx.arc(0, 0, rand(22, 52), 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = rand(4, 8);
            ctx.stroke();
            break;
          case 2: {
            const ps = rand(18, 42);
            ctx.strokeStyle = color;
            ctx.lineWidth = rand(5, 10);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-ps, 0); ctx.lineTo(ps, 0);
            ctx.moveTo(0, -ps); ctx.lineTo(0, ps);
            ctx.stroke();
            break;
          }
          case 3: {
            const ss = rand(18, 46);
            ctx.fillStyle = color;
            ctx.beginPath();
            for (let j = 0; j < 4; j++) {
              const a = (j * Math.PI) / 2;
              const a1 = a - Math.PI / 4;
              const a2 = a + Math.PI / 4;
              if (j === 0) ctx.moveTo(Math.cos(a1) * ss * 0.38, Math.sin(a1) * ss * 0.38);
              ctx.lineTo(Math.cos(a) * ss, Math.sin(a) * ss);
              ctx.lineTo(Math.cos(a2) * ss * 0.38, Math.sin(a2) * ss * 0.38);
            }
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 4: {
            const ds = rand(18, 40);
            ctx.fillStyle = color;
            ctx.fillRect(-ds / 2, -ds / 2, ds, ds);
            break;
          }
        }

        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

  function toggleAccordion(index: number) {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function decompose() {
    if (!task.trim()) return;
    setLoading(true);
    setError('');
    setAbilities([]);
    setOpenItems(new Set());
    setConfirmSave(false);
    setShowTeamSelect(false);
    try {
      const res = await fetch('/api/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
      setAbilities(data.abilities);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setTask('');
    setAbilities([]);
    setError('');
    setOpenItems(new Set());
    setConfirmSave(false);
    setShowTeamSelect(false);
  }

  // 保存ボタン押下：候補数に応じて確認ブロック／チーム選択リストを出し分ける
  function handleSaveClick() {
    if (saveCandidates.length === 1) {
      setConfirmSave(true);
    } else if (saveCandidates.length > 1) {
      setShowTeamSelect(true);
    }
  }

  async function saveResult(teamId: string) {
    if (!session) return;
    setSaving(true);
    setError('');
    try {
      const supabase = createSupabaseBrowser();
      const { data: decomp, error: insertError } = await supabase
        .from('decompositions')
        .insert({
          team_id: teamId,
          created_by: session.user.id,
          task_text: task,
          abilities,
        })
        .select('id')
        .single();

      if (insertError || !decomp) throw insertError ?? new Error('保存に失敗しました');

      router.push(`/home/${teamId}/record/${decomp.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function copyResult() {
    const text = buildRecordText(abilities);
    await navigator.clipboard.writeText(text);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }

  async function signIn() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div className="container">
        <header>
          <h1>それ！できて当たり前？</h1>
          <p className="subtitle">
            あれ？何故できないんだろう？<br className="br-sp" />
            その困りごと、一緒に考えてみましょう。<br />
            「できて当たり前」とされる行動・指示も<br className="br-sp" />
            要素と必要な能力に分解し対応を提案します。
          </p>
        </header>

        <div className="card">
          <div className="card-title">
            <span className="step-badge">1</span>困りごとを入力する
          </div>
          <textarea
            rows={4}
            placeholder="行動や指示、分解に必要な年齢や特徴を書いてください。"
            value={task}
            onChange={e => setTask(e.target.value)}
          />
          <div className="example-area">
            <span className="example-label">例（クリックで入力）：</span>
            {EXAMPLE_TASKS.map(ex => (
              <button key={ex} className="example-btn" onClick={() => setTask(ex)}>
                {ex}
              </button>
            ))}
          </div>
          <div className="action-row">
            <button className="btn-main" onClick={decompose} disabled={loading}>
              分解する
            </button>
            <button className="btn-sub" onClick={resetAll}>クリア</button>
            {loading && <span className="loading">分解中...</span>}
          </div>
          <p className="login-note">
            {!session ? (
              <>
                結果を保存するには分解前にログインしてください
                <button className="btn-sub" onClick={signIn}>Googleでログイン</button>
              </>
            ) : saveCandidates.length === 0 ? (
              <>
                保存先のチームがありません
                <Link href="/account" className="btn-sub">アカウントへ</Link>
              </>
            ) : (
              '分解後に保存できます'
            )}
          </p>
          {error && <div className="error-msg">{error}</div>}
        </div>

        {abilities.length > 0 && (
          <div className="card">
            <div className="card-title">
              <span className="step-badge">↓</span>分解・対応の一覧
              <button className="btn-sub btn-copy" onClick={copyResult}>
                {copyDone ? 'コピーしました' : 'コピー'}
              </button>
              {session && (
                <button
                  className="btn-sub btn-save"
                  onClick={handleSaveClick}
                  disabled={saving || saveCandidates.length === 0}
                >
                  {saving ? '保存中...' : '保存する'}
                </button>
              )}
            </div>
            {abilities.map(({ title, description, person, solution }, i) => (
              <div key={i} className="accordion-item">
                <button className="accordion-header" onClick={() => toggleAccordion(i)}>
                  <span className="accordion-square">◻︎</span>
                  <span className="accordion-title">{title}</span>
                  <span className={`accordion-icon${openItems.has(i) ? ' open' : ''}`}>▼</span>
                </button>
                {openItems.has(i) && (
                  <div className="accordion-body">
                    <div className="ability-description">
                      {description.split('\n').map((line, j) => (
                        <span key={j}>{line}<br /></span>
                      ))}
                    </div>
                    <span className="person-line">当人は？ {person}</span>
                    <div className="ability-solution"><strong>対応：</strong>{solution}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {confirmSave && saveCandidates.length === 1 && (
          <div className="card">
            <p className="confirm-msg">
              {teamDisplayName(saveCandidates[0].teamCallName)}に保存しますか？
            </p>
            <div className="action-row">
              <button
                className="btn-main"
                onClick={() => saveResult(saveCandidates[0].teamId)}
                disabled={saving}
              >
                {saving ? '保存中...' : '保存する'}
              </button>
              <button className="btn-sub" onClick={() => setConfirmSave(false)}>
                キャンセル
              </button>
            </div>
          </div>
        )}

        {showTeamSelect && (
          <div className="card">
            <div className="card-title">保存先のチームを選択</div>
            <ul className="record-list">
              {saveCandidates.map((c) => (
                <li key={c.teamId}>
                  <button
                    className="team-select-btn"
                    onClick={() => saveResult(c.teamId)}
                    disabled={saving}
                  >
                    {teamDisplayName(c.teamCallName)}
                  </button>
                </li>
              ))}
            </ul>
            <div className="action-row">
              <button className="btn-sub" onClick={() => setShowTeamSelect(false)}>
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
