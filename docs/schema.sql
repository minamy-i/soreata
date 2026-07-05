-- soreata: アカウント中心モデルへの再構築SQL
-- 実行場所：Supabase SQL Editor（手動実行）
-- 設計の正本：docs/data_structure.md（構成を変えたら両方更新する）
-- 前提：旧設計（persons中心）のテストデータのみのため、クリーン再構築（全DROP→再作成）を行う

-- ============================================================
-- 0. 旧オブジェクトの削除
-- ============================================================
-- CASCADE により旧テーブルに紐づくRLSポリシー・FKも一緒に削除される
-- auth.users のテストユーザーはここでは削除しない（再ログインすればcallback経由でaccounts行が再生成される）
drop table if exists persons cascade;
drop table if exists decompositions cascade;
drop table if exists accounts cascade;

-- gen_random_uuid() を使うための拡張（Supabaseでは通常有効だが念のため）
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. テーブル作成
-- ============================================================

-- accounts：身元（id・email）のみ。表示名は持たない
create table accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz -- 退会日時（NULL=有効）。退会時はemailを匿名化（NULL化）する
);

-- teams：当人（対象者）1人＝1行。当人（対象者）自身の情報は持たず、チーム名で緩く指し示すだけ
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references accounts(id),
  created_at timestamptz not null default now(),
  webhook_url text, -- 外部ツール（Slack/Discord）への投稿先URL（NULL=未設定）
  webhook_platform text -- 'slack' or 'discord'
);

-- team_members：チームにログインして参加する人。当人（対象者）が未登録の間は行を持たない
create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  account_id uuid not null references accounts(id),
  nickname text, -- このチームでの表示名
  relationship text, -- 当人（対象者）との関係（本人・親・先生など。自由テキスト）
  role text not null, -- 'owner'（当人権限者）／'collaborator'（協力者）
  granted_at timestamptz not null default now(),
  revoked_at timestamptz, -- 解除日時（NULL=現在有効）
  can_manage_webhook boolean not null default false -- ownerから外部ツール連携の管理を委譲された協力者か
);

-- 部分ユニークインデックス
-- owner一意性：チームごとにアクティブなownerは常に1人
create unique index team_members_one_active_owner
  on team_members (team_id)
  where role = 'owner' and revoked_at is null;

-- 重複アクティブ加入防止：同一アカウントが同じチームに2重加入しない
create unique index team_members_unique_active_membership
  on team_members (team_id, account_id)
  where revoked_at is null;

-- decompositions：AI分解記録。編集不可。confirmed_at（能力確認日）・posted_atのみ後から更新可
create table decompositions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  created_by uuid not null references accounts(id),
  task_text text not null,
  abilities jsonb not null,
  created_at timestamptz not null default now(),
  posted_at timestamptz -- 外部ツールへの最終投稿日時（NULL=未投稿）。再投稿はブロックしない
);

-- invitations：招待の保留状態のみを持つ。受諾するとteam_membersに行を作り、この行は削除する
-- 招待作成はサーバー側（サービスロールキー）でinvited_emailが登録済みか確認してから行う想定。tokenは持たない
create table invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  invited_email text not null,
  created_at timestamptz not null default now()
);

-- ownership_transfers：当人権限（owner）移譲の保留状態のみを持つ。承諾するとteam_membersを付け替え、この行は削除する
create table ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  to_account_id uuid not null references accounts(id), -- 移譲先（既にteam_membersに行がある協力者）
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. SECURITY DEFINER 関数（RLSの再帰参照を断ち切るため）
-- ============================================================
-- teams・team_membersのRLSは「team_membersを見て判定する」条件がteam_members自身の
-- 再帰参照になるため、SECURITY DEFINER関数を介して判定する。
-- SECURITY DEFINERは自身が読むテーブルのRLSを無視できるため、再帰を回避できる。
-- search_pathを固定するのはSECURITY DEFINER関数のセキュリティ上の必須対応。

create or replace function is_team_member(t uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from team_members
    where team_id = t
      and account_id = auth.uid()
      and revoked_at is null
  );
$$;

create or replace function is_team_owner(t uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from team_members
    where team_id = t
      and account_id = auth.uid()
      and revoked_at is null
      and role = 'owner'
  );
$$;

-- 招待受諾用：招待された時点ではまだteam_memberではないため、is_team_memberとは別に判定する
create or replace function is_invited(t uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from invitations
    where team_id = t
      and invited_email = (select email from accounts where id = auth.uid())
  );
$$;

-- ============================================================
-- 3. RLS 有効化＋ポリシー
-- ============================================================

-- --- accounts ---
alter table accounts enable row level security;

create policy accounts_select_own on accounts
  for select
  using (auth.uid() = id);

create policy accounts_insert_own on accounts
  for insert
  with check (auth.uid() = id);

create policy accounts_update_own on accounts
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
-- DELETEポリシーは無し。退会は物理削除でなくdeleted_atのUPDATEで表現する

-- --- teams ---
alter table teams enable row level security;

create policy teams_select_member on teams
  for select
  using (is_team_member(id));

-- 招待されたチームは名前だけ読める（/accountでの招待表示のため）
create policy teams_select_invited on teams
  for select
  using (is_invited(id));

create policy teams_insert_own on teams
  for insert
  with check (created_by = auth.uid());

create policy teams_update_owner on teams
  for update
  using (is_team_owner(id))
  with check (is_team_owner(id));

create policy teams_delete_owner on teams
  for delete
  using (is_team_owner(id));

-- --- team_members ---
alter table team_members enable row level security;

create policy team_members_select_member on team_members
  for select
  using (is_team_member(team_id));

-- INSERT後半の例外条件：チーム作成直後はowner行がまだ無くis_team_ownerが偽になるため、
-- 「自分が作った（teams.created_by=自分）チームに、自分をownerとして入れる」INSERTだけ個別に許可する
create policy team_members_insert_owner_or_self on team_members
  for insert
  with check (
    is_team_owner(team_id)
    or (
      account_id = auth.uid()
      and role = 'owner'
      and team_id in (select id from teams where created_by = auth.uid())
    )
  );

-- 招待受諾：自分宛のinvitations行が実在するときだけ、自分をcollaboratorとして追加できる
create policy team_members_insert_collaborator_invited on team_members
  for insert
  with check (
    account_id = auth.uid()
    and role = 'collaborator'
    and revoked_at is null
    and is_invited(team_id)
  );

create policy team_members_update_self_or_owner on team_members
  for update
  using (account_id = auth.uid() or is_team_owner(team_id))
  with check (account_id = auth.uid() or is_team_owner(team_id));
-- DELETEポリシーは無し。除名・移譲はrevoked_atのUPDATEで表現する
-- 残る論点：列単位の制御ができないため、自分の行のrole・revoked_atも理屈上は自己書き換え可能
-- （現状は当人権限者本人しかいないため実害なし。協力者運用開始時にトリガーで対処を検討）

-- --- decompositions ---
alter table decompositions enable row level security;

create policy decompositions_select_member on decompositions
  for select
  using (is_team_member(team_id));

create policy decompositions_insert_member on decompositions
  for insert
  with check (is_team_member(team_id) and created_by = auth.uid());

create policy decompositions_update_member on decompositions
  for update
  using (is_team_member(team_id))
  with check (is_team_member(team_id));

create policy decompositions_delete_owner on decompositions
  for delete
  using (is_team_owner(team_id));

-- --- invitations ---
alter table invitations enable row level security;

create policy invitations_select_owner_or_invitee on invitations
  for select
  using (
    is_team_owner(team_id)
    or invited_email = (select email from accounts where id = auth.uid())
  );

create policy invitations_insert_owner on invitations
  for insert
  with check (is_team_owner(team_id));

create policy invitations_delete_owner_or_invitee on invitations
  for delete
  using (
    is_team_owner(team_id)
    or invited_email = (select email from accounts where id = auth.uid())
  );

-- --- ownership_transfers ---
alter table ownership_transfers enable row level security;

create policy ownership_transfers_select_owner_or_target on ownership_transfers
  for select
  using (is_team_owner(team_id) or to_account_id = auth.uid());

create policy ownership_transfers_insert_owner on ownership_transfers
  for insert
  with check (is_team_owner(team_id));

create policy ownership_transfers_delete_owner_or_target on ownership_transfers
  for delete
  using (is_team_owner(team_id) or to_account_id = auth.uid());

-- ============================================================
-- 4. RPC関数（アプリから直接呼び出す処理）
-- ============================================================
-- チーム作成はteams→team_membersの2段INSERTだが、素朴に2回に分けると
-- 「teams作成直後、team_membersがまだ無いのでteams_select_memberが通らずteams行を読み返せない」
-- （teamsのSELECTポリシーがis_team_member/is_invited基準のため、作成直後は両方偽になる）。
-- 加えて2回に分けると、1回目が成功し2回目が失敗した場合にメンバーのいない孤立チームが残る。
-- この関数はteams作成とteam_members(owner)作成を1つのトランザクションにまとめ、両方を解消する。
-- created_by/account_idはauth.uid()を関数内で直接使うため、他人になりすましたINSERTはできない。
create or replace function create_team_with_owner(
  team_name text,
  owner_nickname text,
  owner_relationship text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_team_id uuid;
begin
  insert into teams (name, created_by)
  values (team_name, auth.uid())
  returning id into new_team_id;

  insert into team_members (team_id, account_id, nickname, relationship, role)
  values (new_team_id, auth.uid(), owner_nickname, owner_relationship, 'owner');

  return new_team_id;
end;
$$;
