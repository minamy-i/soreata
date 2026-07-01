import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect(`/login?next=/home/${id}`);

  // 自分のpersonsレコードか確認
  const { data: person } = await supabase
    .from('persons')
    .select('id, nickname')
    .eq('id', id)
    .eq('account_id', session.user.id)
    .single();

  if (!person) redirect('/');

  // AI分析記録を新しい順に取得
  const { data: decompositions } = await supabase
    .from('decompositions')
    .select('id, task_text, created_at')
    .eq('person_id', id)
    .order('created_at', { ascending: false });

  return (
    <div className="container">
      {person.nickname && (
        <p className="page-title">{person.nickname} さんのダッシュボード</p>
      )}

      <div className="card">
        <div className="card-title">AI分析の記録</div>
        {!decompositions || decompositions.length === 0 ? (
          <p className="empty-note">分解して保存してみましょう</p>
        ) : (
          <ul className="record-list">
            {decompositions.map((d) => (
              <li key={d.id}>
                <Link href={`/home/${id}/record/${d.id}`} className="record-item">
                  <span className="record-date">
                    {new Date(d.created_at).toLocaleDateString('ja-JP')}
                  </span>
                  <span className="record-task">{d.task_text}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
