## テーブル一覧

### auth.users（Supabase管理・v1）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |

### accounts（v1）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | auth.users.id と同じ UUID |
| email | text | |
| created_at | timestamptz | |

### teams（v1）
当人1人 = 1行。当人という存在そのものを表す。

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| name | text | チーム名。当人の呼び名を織り込む（例「チーム太郎」） |
| created_by | uuid FK | accounts.id |
| created_at | timestamptz | |

### team_members（v1）
チームにログインして参加する人。当人本人の行は作らない（未登録＝アカウント無し＝メンバーになれない）。
当人権限者（role='owner'）の行が必ず1人存在する。空席にしない。

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| team_id | uuid FK | teams.id |
| account_id | uuid FK | accounts.id（NOT NULL・常に実アカウントのUUID） |
| nickname | text | このチームでの表示名（太郎・お母さん・田中先生） |
| relationship | text | 当人との関係（本人・親・保護者・先生など。自由テキスト） |
| role | text | `owner`（当人権限者）／`collaborator`（協力者） |
| granted_at | timestamptz | 参加日時 |
| revoked_at | timestamptz | 解除日時（NULL = 現在有効） |

**行の例**
| 場面 | account_id（＝誰のアカウントのUUIDか） | relationship | role |
|---|---|---|---|
| 当人本人が登録・参加 | 本人のアカウント | 本人 | owner |
| 未登録の子を親が代行 | 親のアカウント | 親／保護者 | owner |
| 先生（協力者） | 先生のアカウント | 先生 | collaborator |

※当人権限（owner）の移譲は最初から実装する（付け替え操作）。複数人での保有はしない（増やすなら「副」を将来検討）。

### decompositions（v1）※要改訂：person_id → team_id へ変更予定
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| person_id | uuid FK | persons.id（廃止予定。team_id に変更） |
| created_by | uuid FK | accounts.id |
| task_text | text | |
| abilities | jsonb | |
| created_at | timestamptz | |

### invitations（v2）※要改訂：person_id → team_id へ変更予定・新モデル未反映
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| person_id | uuid FK | persons.id（廃止予定。team_id に変更） |
| invited_email | text | |
| token | text | |
| created_at | timestamptz | |
| accepted_at | timestamptz | |

### memos（v2）※要改訂：person_id → team_id へ変更予定・新モデル未反映
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| person_id | uuid FK | persons.id（廃止予定。team_id に変更） |
| created_by | uuid FK | accounts.id |
| title | text | 必須 |
| body | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### posts（v2）※要改訂：person_id → team_id へ変更予定・新モデル未反映
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| person_id | uuid FK | persons.id（廃止予定。team_id に変更） |
| created_by | uuid FK | accounts.id |
| content | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| summary_requested_at | timestamptz | まとめ依頼日時 |
| summary_text | text | |
| approved_at | timestamptz | 当人承諾日時 |

### comments（v2）※要改訂：新モデル未反映（posts の改訂に追従）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| post_id | uuid FK | posts.id |
| created_by | uuid FK | accounts.id |
| content | text | |
| created_at | timestamptz | |

---

## RLS ポリシー（v1）※要改訂：teams・team_members 前提に全面再設計

| テーブル | ポリシー名 | 操作 | 条件 |
|---|---|---|---|
| accounts | accounts_select_own | SELECT | auth.uid() = id |
| accounts | accounts_insert_own | INSERT | auth.uid() = id |
| accounts | accounts_update_own | UPDATE | auth.uid() = id |
| accounts | accounts_delete_own | DELETE | auth.uid() = id |
| persons | persons_select_own | SELECT | auth.uid() = account_id |
| persons | persons_insert_own | INSERT | auth.uid() = account_id |
| persons | persons_update_own | UPDATE | auth.uid() = account_id |
| persons | persons_delete_own | DELETE | auth.uid() = account_id |
| decompositions | decompositions_select_own | SELECT | auth.uid() = created_by |
| decompositions | decompositions_insert_own | INSERT | auth.uid() = created_by |
| decompositions | decompositions_update_own | UPDATE | auth.uid() = created_by |
| decompositions | decompositions_delete_own | DELETE | auth.uid() = created_by |

teams・team_members のRLSは、team_members を参照する条件がテーブル自身の再帰参照になるため、
SECURITY DEFINER 関数（例：`is_team_member(team_id)`）を介して判定する設計が必要。次回に詰める。

## RLS ポリシー（v2）※要改訂
v2 では協力者が decompositions の confirmed_at を更新できる。
ポリシーは v2 実装時に改めて設計する。

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
- teams は当人1人 = 1行。チーム名に当人の呼び名を織り込む（「チーム太郎」など）。当人専用の名前カラムは持たない。
- team_members は「ログインして参加する人」のみを持つ。当人本人が未登録の間は行を持たない。
- team_members の role（当人権限者／協力者）と relationship（当人との関係）は別カラム。当人権限者は必ず1人・空席にしない。
- abilities JSON に AI分析の全フィールドと confirmed_at を保存する。集計が必要になったら別テーブルに移行。
- AI分析記録は編集不可。能力確認日のみ後から更新可。

※次に詰めること：decompositions 以下の person_id → team_id 化、RLS 再設計（is_team_member 関数）、他 v2 テーブルの反映。
