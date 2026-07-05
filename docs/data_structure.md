ER図：`docs/data_structure_diagram.md` 参照。テーブル構成を変更した場合はそちらも追随して更新する。

## テーブル一覧

### auth.users（Supabase管理）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |

### accounts
| カラム | 型 | NULL | 備考 |
|---|---|---|---|
| id | uuid PK | NOT NULL | auth.users.id と同じ UUID |
| email | text | NULL可 | 退会時に匿名化（NULL化）するため |
| created_at | timestamptz | NOT NULL | |
| deleted_at | timestamptz | NULL可 | 退会日時（NULL = 有効）。退会時は email を匿名化（NULL化）する |

### teams
当人（対象者）1人 = 1行。当人（対象者）という存在そのものを表す。

| カラム | 型 | NULL | 備考 |
|---|---|---|---|
| id | uuid PK | NOT NULL | |
| name | text | NOT NULL | 当人（対象者）の呼び名のみを保存（例「太郎」）。「チーム」の前置は表示側で行う（アプリのteamDisplayName相当の処理。理由：ownerが当人（対象者）本人の場合、呼び名とニックネームが同じ文字列になり得るため、保存段階では区別を作らず表示側で一律に区別する） |
| created_by | uuid FK | NOT NULL | accounts.id。作成時に必ず入る |
| created_at | timestamptz | NOT NULL | |
| webhook_url | text | NULL可 | 外部ツール（Slack/Discord）への投稿先URL（NULL = 未設定） |
| webhook_platform | text | NULL可 | `slack` or `discord`（送信データの形式を区別するため） |

### team_members
チームにログインして参加する人。当人（対象者）の行は作らない（未登録＝アカウント無し＝メンバーになれない）。
当人権限者（role='owner'）の行が必ず1人存在する。空席にしない。当人（対象者）がアカウントを持つ場合は、そのアカウントを第一候補とする。

| カラム | 型 | NULL | 備考 |
|---|---|---|---|
| id | uuid PK | NOT NULL | |
| team_id | uuid FK | NOT NULL | teams.id |
| account_id | uuid FK | NOT NULL | accounts.id（常に実アカウントのUUID） |
| nickname | text | NULL可 | このチームでの表示名（太郎・お母さん・田中先生）。初回未入力＝空セルを許す |
| relationship | text | NULL可 | 当人（対象者）との関係（本人・親・保護者・先生など。自由テキスト）。初回未入力＝空セルを許す |
| role | text | NOT NULL | `owner`（当人権限者）／`collaborator`（協力者） |
| granted_at | timestamptz | NOT NULL | 参加日時 |
| revoked_at | timestamptz | NULL可 | 解除日時（NULL = 現在有効） |
| can_manage_webhook | boolean | NOT NULL | ownerから外部ツール連携の管理を委譲された協力者か（デフォルトfalse）。複数人にtrueを付けてよい |

**行の例**
| 場面 | account_id（＝誰のアカウントのUUIDか） | relationship | role |
|---|---|---|---|
| 当人（対象者）が登録・参加 | 本人のアカウント | 本人 | owner |
| 未登録の子を親が代行 | 親のアカウント | 親／保護者 | owner |
| 先生（協力者） | 先生のアカウント | 先生 | collaborator |

※当人権限（owner）の移譲は最初から実装する（付け替え操作）。複数人での保有はしない（増やすなら「副」を将来検討）。

**制約（部分ユニークインデックス）**
- owner一意性：`UNIQUE (team_id) WHERE role='owner' AND revoked_at IS NULL`
- 重複アクティブ加入防止：`UNIQUE (team_id, account_id) WHERE revoked_at IS NULL`

### decompositions
| カラム | 型 | NULL | 備考 |
|---|---|---|---|
| id | uuid PK | NOT NULL | |
| team_id | uuid FK | NOT NULL | teams.id |
| created_by | uuid FK | NOT NULL | accounts.id。作成時に必ず入る |
| task_text | text | NOT NULL | 記録は完成物のみ保存＝作成時に必ず入る |
| abilities | jsonb | NOT NULL | AI分解結果。作成時に必ず入る |
| created_at | timestamptz | NOT NULL | |
| posted_at | timestamptz | NULL可 | 外部ツール（Slack/Discord）への最終投稿日時（NULL = 未投稿）。再投稿はブロックしない。単なる表示用 |

### invitations
招待の保留状態のみを持つテーブル。受諾するとteam_membersにcollaborator行を作り、invitationsの行は削除する。
account_idは持たない（受諾者はteam_membersのaccount_idで確定するため）。招待履歴は残さない。
受諾のDELETEは既存の`invitations_delete_owner_or_invitee`（invited_email=自分のemail）でそのまま通る。
招待はサーバー側（サービスロールキー）で、invited_emailが登録済みアカウントと一致することを確認してから作成する。招待リンクという仕組みを持たないため、tokenは不要。
| カラム | 型 | NULL | 備考 |
|---|---|---|---|
| id | uuid PK | NOT NULL | |
| team_id | uuid FK | NOT NULL | teams.id |
| invited_email | text | NOT NULL | 招待にメアドは必須 |
| created_at | timestamptz | NOT NULL | |

### ownership_transfers
当人権限（owner）移譲の保留状態のみを持つテーブル。承諾するとteam_membersのowner行を付け替え、この行は削除する。招待履歴を残さない方針と同様、移譲履歴も残さない。
| カラム | 型 | NULL | 備考 |
|---|---|---|---|
| id | uuid PK | NOT NULL | |
| team_id | uuid FK | NOT NULL | teams.id |
| to_account_id | uuid FK | NOT NULL | accounts.id（移譲先。既にteam_membersに行がある協力者）。次のownerの承諾が出るまで前のownerが必ず入る |
| created_at | timestamptz | NOT NULL | |

---

## RLS ポリシー（確定分）

### SECURITY DEFINER 関数
teams・team_members のRLSは、team_members を参照する条件がテーブル自身の再帰参照になるため、
関数を介して判定する。SECURITY DEFINER 関数は自身が読むテーブルのRLSを無視できるため、再帰を断ち切れる。

- `is_team_member(t uuid)`：team_members に `team_id=t AND account_id=auth.uid() AND revoked_at IS NULL` の行が存在するか
- `is_team_owner(t uuid)`：上に加えて `role='owner'`
- `is_invited(t uuid)`：invitations に `team_id=t AND invited_email=自分のemail` の行が存在するか（招待受諾用。招待された時点では自分はまだteam_memberではないため、is_team_memberとは別関数にする）

### ポリシー

| テーブル | ポリシー名 | 操作 | 条件 |
|---|---|---|---|
| accounts | accounts_select_own | SELECT | auth.uid() = id |
| accounts | accounts_insert_own | INSERT | auth.uid() = id |
| accounts | accounts_update_own | UPDATE | auth.uid() = id |
| teams | teams_select_member | SELECT | is_team_member(id) |
| teams | teams_select_invited | SELECT | is_invited(id) |
| teams | teams_insert_own | INSERT | created_by = auth.uid() |
| teams | teams_update_owner | UPDATE | is_team_owner(id) |
| teams | teams_delete_owner | DELETE | is_team_owner(id) |
| team_members | team_members_select_member | SELECT | is_team_member(team_id) |
| team_members | team_members_insert_owner_or_self | INSERT | is_team_owner(team_id) OR（account_id=auth.uid() AND role='owner' AND team_id が自分のcreated_byのteams） |
| team_members | team_members_insert_collaborator_invited | INSERT | account_id=auth.uid() AND role='collaborator' AND revoked_at IS NULL AND is_invited(team_id)（招待受諾） |
| team_members | team_members_update_self_or_owner | UPDATE | account_id = auth.uid() OR is_team_owner(team_id) |
| decompositions | decompositions_select_member | SELECT | is_team_member(team_id) |
| decompositions | decompositions_insert_member | INSERT | is_team_member(team_id) AND created_by = auth.uid() |
| decompositions | decompositions_update_member | UPDATE | is_team_member(team_id) |
| decompositions | decompositions_delete_owner | DELETE | is_team_owner(team_id) |
| invitations | invitations_select_owner_or_invitee | SELECT | is_team_owner(team_id) OR invited_email = (SELECT email FROM accounts WHERE id = auth.uid()) |
| invitations | invitations_insert_owner | INSERT | is_team_owner(team_id) |
| invitations | invitations_delete_owner_or_invitee | DELETE | is_team_owner(team_id) OR invited_email = (SELECT email FROM accounts WHERE id = auth.uid()) |
| ownership_transfers | ownership_transfers_select_owner_or_target | SELECT | is_team_owner(team_id) OR to_account_id = auth.uid() |
| ownership_transfers | ownership_transfers_insert_owner | INSERT | is_team_owner(team_id) |
| ownership_transfers | ownership_transfers_delete_owner_or_target | DELETE | is_team_owner(team_id) OR to_account_id = auth.uid() |

- accountsにDELETEポリシーは無し。退会は物理削除でなく`deleted_at`のUPDATEで表現するため、accounts_update_ownで足りる。
- team_membersにDELETEポリシーは無し。除名・移譲は`revoked_at`のUPDATEで表現する。
- `team_members_insert_owner_or_self`の後半条件（作成時例外）：チーム作成直後はowner行がまだ無くis_team_ownerが偽になるため、「自分が作った（teams.created_by=自分）チームに、自分をownerとして入れる」INSERTだけ個別に許す。ただしアプリからのチーム作成は下記`create_team_with_owner`経由になったため、この条件は通常経路では使われない（将来直接INSERTする経路ができた場合の保険として残す）。
- `persons`のRLSは削除（テーブル廃止）。

### RPC関数（アプリから直接呼び出す処理）
- `create_team_with_owner(team_name, owner_nickname, owner_relationship) returns uuid`：teams作成とteam_members(owner)作成を1トランザクションにまとめるSECURITY DEFINER関数。
  - 理由：2回に分けてINSERTすると、teams作成直後はteam_membersがまだ無く`teams_select_member`/`teams_select_invited`のどちらも偽になるため、作成した`teams`行を読み返せない（`.select().single()`が0件エラーになる）。加えて2回に分けると1回目成功・2回目失敗でメンバーのいない孤立チームが残るリスクがある。
  - created_by・account_idは関数内でauth.uid()を直接使うため、他人になりすましたINSERTはできない。

### 残る論点（今は実害なし・協力者運用開始時に対処）
`team_members_update_self_or_owner`は列単位の制御ができないため、自分の行に対して本来nickname編集のみを許したい意図でも、理屈上はrole・revoked_atも自己書き換えできてしまう。現状は当人権限者本人しかいないため実害はない。協力者管理の運用が始まる際に、トリガー等でrole・revoked_atの自己書き換えを禁止する対応を検討する。

`teams_update_owner`はownerのみを許可しており、`can_manage_webhook`がtrueの協力者はwebhook_url・webhook_platformを更新できない（RLSは行単位のみで、teams.nameとWebhook列を列単位で区別できないため）。委譲された協力者がWebhook設定を更新できるようにするには、トリガーで他の列の変更を拒否するか、専用のSECURITY DEFINER関数（RPC）経由に限定するかの対応が実装時に必要。

## RLS ポリシー（検討中）
decompositionsの確認日（confirmed_at）を協力者が更新できる件は、既存の`decompositions_update_member`（is_team_member基準）で既に成立しており、追加設計は不要。

---

## abilities JSON スキーマ

```json
[
  {
    "title": "能力タイトル",
    "description": "説明文",
    "person": "当人は？（体験の記述）",
    "solution": "対応",
    "confirmed_at": null
  }
]
```

- AI分析の出力をそのまま全フィールド保存する
- `confirmed_at`：能力確認日。未確認は `null`、確認後は `"YYYY-MM-DD"`
- 集計が必要になったら別テーブルに移行する

---

## テーブル設計の方針
- accounts.id は auth.users.id と同じ UUID。RLS で auth.uid() = id として使う。
- accounts は身元（id・email）のみを持つ。表示名は持たない。
- teams は当人（対象者）1人 = 1行。teams.nameには呼び名のみを保存し（「太郎」など）、「チーム」の前置は表示側で行う。当人（対象者）専用の名前カラムは持たない。
- team_members は「ログインして参加する人」のみを持つ。当人（対象者）が未登録の間は行を持たない。
- team_members の role（当人権限者／協力者）と relationship（当人（対象者）との関係）は別カラム。当人権限者は必ず1人・空席にしない。
- abilities JSON に AI分析の全フィールドと confirmed_at を保存する。集計が必要になったら別テーブルに移行。
- AI分析記録は編集不可。能力確認日（confirmed_at）・外部ツール投稿日時（posted_at）のみ後から更新可。

- チーム削除時は、team_members・decompositions・invitations・ownership_transfersのteam_id外部キーにON DELETE CASCADEを設定し、関連行を自動的に削除する。
- accounts の削除は2パターンに分かれる。
  - team_membersの行が過去も含めて一度も無い（teams.created_byの参照も無い）：FKの参照が存在しないため、accounts行を物理削除＋Supabase Authユーザー削除する
  - 過去にteam_membersの行があった（現在は0件でも履歴が残っている）：物理削除するとteams.created_by・team_membersの履歴行がFKで退会をブロックするため、従来通りdeleted_atで論理削除し、退会時にemailを匿名化する
