# NEXT

更新：2026-07-04
push：後日改めて

## RPD 残量
2026-06-18:55/500, 19:44/500, 20:62/500, 21~:44/500

## 次にやること

### DB刷新：アカウント中心モデルへの再設計

決定経緯 → `docs/NOTES.md`「DBテーブル刷新：アカウント中心モデルへの再設計」参照

- [x] docs/data_structure.md：中核3テーブル（accounts・teams・team_members）書き換え済み（2026-07-04）
- [ ] 設計：decompositions・invitations・memos・posts・comments の person_id → team_id 化
- [ ] 設計：RLS再設計（team_members参照の無限再帰を避けるSECURITY DEFINER関数 is_team_member 等）
- [ ] 設計：当人権限（owner）移譲の仕組み（即時切替か相手の承諾制か・実行できる場所〈v1範囲でのメンバー一覧の要否〉）
- [ ] フェーズ1：DB刷新（Supabase SQL Editor・手動）※上記設計が確定してから着手
  - teams, team_members テーブル作成
  - accounts の nickname カラム削除
  - decompositions の person_id → team_id 変更
  - RLS ポリシー整備
  - persons テーブル削除
  - SQL文はClaudeが書き出す → 自分がSupabase SQL Editorで実行
- [ ] フェーズ2：認証コールバック修正（`app/auth/callback/route.ts`）
  - persons の自動作成を削除
- [ ] フェーズ3：アカウントダッシュボード改修（`app/account/page.tsx`）
  - team_members からマイチーム・協力チームを取得
  - 「チームを作成する」ボタン追加
  - アカウント削除ボタン追加（チーム所属ゼロの場合のみ表示）
- [ ] フェーズ4：チーム作成フロー実装（新規ページまたはモーダル）
  - 本人／代理の選択
  - チーム名（当人の呼び名）・関係（relationship）の入力
  - teams + team_members（role='owner'）の作成
  - /home/[team_id] へ遷移
- [ ] フェーズ5：AI分解画面の保存フロー更新（`app/page.tsx`）
  - 未ログイン：保存ボタン非表示
  - ログイン＋チーム0件：保存ボタン非活性・/account への誘導
  - ログイン＋チーム1件：保存ボタン（自動的にそのチームへ保存）
  - ログイン＋チーム複数：保存ボタン → チーム選択UI
- [ ] フェーズ6：チームダッシュボード改修（`app/home/[id]/*`）
  - person_id → team_id 対応
  - team_members のアクセス制御（非メンバーを /account にリダイレクト）
  - 当人権限者情報設定を team_members ベースに
  - チームメンバー一覧・当人権限の移譲操作（設計確定後に反映）
- [ ] フェーズ7：アカウント削除実装
  - accounts 行 + Supabase Auth ユーザ削除
  - 条件：team_members に自分の行が0件のみ
- [ ] フェーズ8：ドキュメント更新・整理
  - `docs/data_structure.md`：decompositions以下・RLSの改訂を反映
  - `docs/SPEC.md`：認証・登録フロー（招待リンク有無でアカウント種別を自動判定する現行記述は「チームは明示的操作でのみ作成」という決定と矛盾するため全面書き換え）／保存フロー／チーム作成フロー／退会仕様を更新
  - `docs/screen_tree.md`：チームメンバー一覧・チーム作成ページ・保存フロー分岐を反映
  - `data/collaborators_sample.ts`：削除

### v2未決事項
- 会議室のURL（`/home/[team_id]/meeting` は仮）
- 外部メールサービス（招待メール送信に必要）
- 当人権限者情報設定の内容（管理者情報など）
- チームダッシュボードのタブ構成・名前

---

## 能力補完の観点を持つ専門家への相談（実現できたら）

### soreataの説明
- 「できて当たり前」とされる行動・指示を、要素と必要な能力に分解し対応を提案するWebアプリ
- 診断でなく困りごとの要素分解図。人を評価しない、行動を変えようとしない
- 困りごとの中に折り畳まれた能力を掘り出すことが目的
- AIが6カテゴリ（人・物・動作・空間・時間・知識）で内部分析し、能力ごとに対応を提案する
- 「掘れる人の目」を掘れない人に貸す道具

### 相談したいこと
- 見落としやすい能力パターンを教えてもらう
- 6カテゴリが妥当かどうか確認する
- EXAMPLES.mdの例を読んでもらい、能力分析がずれていないか確認する
- よくある困りごとと背景にある能力を教えてもらう（few-shot例の素材として）
- 対応策の方向性が的外れでないか確認する
