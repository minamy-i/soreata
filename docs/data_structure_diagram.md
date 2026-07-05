# データ構造図（ER図）

`docs/data_structure.md` の内容を mermaid の ER図として可視化したもの。
正（ソース・オブ・トゥルース）は常に `data_structure.md`。
`data_structure.md` のテーブル定義・RLSを変更した場合は、この図も追随して更新する。

```mermaid
erDiagram
    auth_users["auth.users"] {
        uuid id PK
    }

    accounts {
        uuid id PK "auth.users.id と同じUUID"
        text email
        timestamptz created_at
        timestamptz deleted_at "退会時刻・NULL=有効"
    }

    teams {
        uuid id PK
        text name "呼び名のみ・例：太郎（表示時に「チーム」前置）"
        uuid created_by FK "accounts.id"
        timestamptz created_at
        text webhook_url "外部ツール投稿先URL・NULL可"
        text webhook_platform "slack or discord"
    }

    team_members {
        uuid id PK
        uuid team_id FK "teams.id"
        uuid account_id FK "accounts.id・NOT NULL"
        text nickname
        text relationship
        text role "owner／collaborator"
        timestamptz granted_at
        timestamptz revoked_at "NULL=現在有効"
        boolean can_manage_webhook "Webhook管理の委譲・複数人可"
    }

    decompositions {
        uuid id PK
        uuid team_id FK "teams.id・NOT NULL"
        uuid created_by FK "accounts.id"
        text task_text
        jsonb abilities
        timestamptz created_at
        timestamptz posted_at "外部ツールへの最終投稿日時・NULL可"
    }

    invitations {
        uuid id PK
        uuid team_id FK "teams.id・NOT NULL"
        text invited_email
        timestamptz created_at
    }

    ownership_transfers {
        uuid id PK
        uuid team_id FK "teams.id・NOT NULL"
        uuid to_account_id FK "accounts.id・移譲先"
        timestamptz created_at
    }

    auth_users ||--|| accounts : "id同一"
    accounts ||--o{ team_members : "account_id"
    accounts ||--o{ teams : "created_by"
    accounts ||--o{ decompositions : "created_by"
    accounts ||--o{ ownership_transfers : "to_account_id"
    teams ||--o{ team_members : "team_id"    
    teams ||--o{ invitations : "team_id"
    teams ||--o{ decompositions : "team_id"    
    teams ||--o{ ownership_transfers : "team_id"


```

## 凡例

- 確定テーブル：auth.users・accounts・teams・team_members・decompositions・invitations・ownership_transfers
- 観察記録（memos）・会議室（posts・comments）はsoreataの範囲外と確定したため図から削除（`docs/NOTES.md`「コミュニケーション機能をsoreataの範囲外にする」参照）
