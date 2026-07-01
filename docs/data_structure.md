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
| nickname | text | ログインユーザ自身の名前 |
| created_at | timestamptz | |

### persons（v1）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK | accounts.id |
| nickname | text | 当人の名前 |
| created_at | timestamptz | |
| relationship | text | v2追加：当人との関係（親・先生など） |
| granted_at | timestamptz | v2追加：登録日時 |
| revoked_at | timestamptz | v2追加：解除日時（NULL = 現在有効） |

### decompositions（v1）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| person_id | uuid FK | persons.id |
| created_by | uuid FK | accounts.id |
| task_text | text | |
| abilities | jsonb | |
| created_at | timestamptz | |

### invitations（v2）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| person_id | uuid FK | persons.id |
| invited_email | text | |
| token | text | |
| created_at | timestamptz | |
| accepted_at | timestamptz | |

### collaborators（v2）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| person_id | uuid FK | persons.id |
| account_id | uuid FK | accounts.id |
| relationship | text | 当人との関係 |
| granted_at | timestamptz | |
| revoked_at | timestamptz | NULL = 現在有効 |

### memos（v2）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| person_id | uuid FK | persons.id |
| created_by | uuid FK | accounts.id |
| title | text | 必須 |
| body | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### posts（v2）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| person_id | uuid FK | persons.id |
| created_by | uuid FK | accounts.id |
| content | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| summary_requested_at | timestamptz | まとめ依頼日時 |
| summary_text | text | |
| approved_at | timestamptz | 当人承諾日時 |

### comments（v2）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| post_id | uuid FK | posts.id |
| created_by | uuid FK | accounts.id |
| content | text | |
| created_at | timestamptz | |

---

## RLS ポリシー（v1）

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

## RLS ポリシー（v2）
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
- accounts.nickname はログインユーザ自身の名前。persons.nickname は当人の名前。
- 両者を分けることで、当人が Google アカウントを失った場合に persons レコードを別の accounts に付け替えられる。
- abilities JSON に AI分析の全フィールドと confirmed_at を保存する。集計が必要になったら別テーブルに移行。
- AI分析記録は編集不可。能力確認日のみ後から更新可。
