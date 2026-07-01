import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import RecordDetail from "./RecordDetail";

export type Ability = {
  title: string;
  description: string;
  person: string;
  solution: string;
  confirmed_at: string | null;
};

export default async function RecordPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string }>;
}) {
  const { id, recordId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect(`/login?next=/home/${id}/record/${recordId}`);

  // 自分のpersonsレコードか確認
  const { data: person } = await supabase
    .from('persons')
    .select('id')
    .eq('id', id)
    .eq('account_id', session.user.id)
    .single();

  if (!person) redirect('/');

  // AI分析記録の取得
  const { data: decomp } = await supabase
    .from('decompositions')
    .select('id, task_text, abilities, created_at')
    .eq('id', recordId)
    .eq('person_id', id)
    .single();

  if (!decomp) redirect(`/home/${id}`);

  return (
    <RecordDetail
      personId={id}
      decomp={{
        id: decomp.id,
        task_text: decomp.task_text,
        abilities: decomp.abilities as Ability[],
        created_at: decomp.created_at,
      }}
    />
  );
}
