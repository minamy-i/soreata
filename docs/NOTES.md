# NOTES

---

## 当人・当人権限者の定義とteams・team_membersの詳細設計

日時：2026-07-04

結論：
当人＝teamsの1行に対応する実在の人物。teamsは当人の情報を持つわけではなく、チーム名（「チーム太郎」）で緩く指し示すだけ。
当人権限者＝team_membersでrole='owner'を持つアカウント。当人本人がログインして参加していれば当人と同一人物、代行者（親など）が持つ場合は別人。
team_membersのnickname・relationshipは当人権限者（および協力者）自身の情報であり、当人本人の情報ではない。「当人情報設定」ページで編集するのも当人権限者自身の呼び名（例：親が代行するなら「太郎くんママ」）。
role（当人権限者／協力者）とrelationship（本人・親・先生など）は別カラムに分離する。roleの値は英語（owner／collaborator）、relationshipは自由テキスト。
当人権限者は必ず1人・空席にしない。作成者（本人 or 代行の親）が持つ。移譲は最初から作る（具体的な仕組み・即時か承諾制か・実行場所は未設計）。
チーム名は当人の呼び名を織り込む「きまりごと」（例「チーム太郎」）。保存形式は、チーム名を含むフル文字列（「チーム太郎」）をそのまま保存する。

連動：
- `docs/data_structure.md`：teams・team_members セクションに反映済み（2026-07-04）
- `docs/SPEC.md`：当人権限者関連の表記を反映済み（2026-07-04）
- decompositions以下（person_id→team_id化）・RLS再設計・当人権限移譲の仕組みは次回

不採用案：
- 当人本人もteam_membersに1行持つ案（未登録時account_idをNULLにする）：NULL行を許すとRLS判定・「参加者」の意味が濁る。当人という主題はteamsが表せば足りるため採用しない。
- teams.nameとは別にteams.subject_nameを設ける案：チーム名の命名規則（「チーム○○」）で当人を指し示せるため、専用カラムを増やす理由がない。将来当人名だけを構造化データとして持つ必要が出たら列追加で対応する。
- 未登録の当人の代行者がteam_membersに「親としての行」と「当人としての行」を2行持つ案：当人権限者の行1つ（relationship='親'）で足りるため不要。

---

## DBテーブル刷新：アカウント中心モデルへの再設計

日時：2026-07-03

結論：personsテーブル・collaboratorsテーブル（v2計画）を廃止し、teams + team_membersに刷新する。
accountsのnicknameカラムを削除（ニックネームはチームごとにteam_membersが持つ）。
decompositionsのperson_idをteam_idに変更。
「当人本人」と「当人代理（親・先生など）」の区別はteam_membersのrelationshipフィールドで表現する。
チームは明示的な操作（「チームを作成する」ボタン）でのみ作成する。ログイン=チーム自動作成にはしない。

連動：
- `docs/data_structure.md`：テーブル定義を全面書き換え（フェーズ8で実施）
- `docs/SPEC.md`：認証フロー・保存フロー・チーム作成フロー・アカウント削除仕様を更新（フェーズ8で実施）
- `app/auth/callback/route.ts`：personsの自動作成を削除（フェーズ2）
- `app/account/page.tsx`：team_membersからチーム一覧を取得に切り替え（フェーズ3）
- `app/page.tsx`：保存フローをチーム所属状態で分岐（フェーズ5）
- `app/home/[id]/*`：person_id → team_id（フェーズ6）

不採用案：
- persons継続案（既存のpersons + collaboratorsのまま進む）：画面設計をアカウント中心に整理したにもかかわらずDBが当人権限者中心のままだと、v2以降の機能追加でさらに設計のずれが拡大する。整理のタイミングを逃すと後になるほどコストが上がるため採用しない。
- 当人代理を別テーブルで管理する案（personsを残しつつproxy_accountsを追加）：team_membersのrelationshipフィールドで「本人」「親」「先生」などを表現できるため、テーブルを増やす理由がない。
- accountsにnicknameを残す案：チームによって表示名が異なる場合（チームAでは「お父さん」、チームBでは「田中」など）に対応できない。チームごとの表示名はteam_membersに持つ方が整合する。

---

## プロンプト改善の方針と原則の順番

日時：2026-07-01 22:02

結論：プロンプト改善の相談はGeminiではなくClaudeチャットに聞く。
【分解の原則】の順番は出力に直接影響する。感覚の2行を上位（2・3番目）に移動したことでGeminiが聴覚処理の軸を出すようになった。

連動：
- `lib/prompt.ts`・`gitignores/prompt.js` の【分解の原則】の順番
- 原則の順番を変える場合は両ファイルを同時に変更する

不採用案：
- Geminiが提案した「代償行動」の行を追加する案：既存の原則と重複し、順番変更の方が効果的だったため採用しなかった。
- Geminiにプロンプト改善を相談する：自分の弱点を補う提案が自己参照的になりやすく、Claudeチャットに聞いた方が的確な改善案が出た。

---

## [minamy-memo] Phase 0〜4 実装フェーズの全体像

日時：2026-06-30

### 全体の場所と流れ

| フェーズ | 作業場所 | 何をしたか |
|---|---|---|
| Phase 0 | Supabase サイト（手動） | アカウント登録・プロジェクト作成・APIキー取得 |
| Phase 1 | ローカルPC | Next.js フレームワークの骨格を作った |
| Phase 2 | ローカルPC | Supabase への接続口をコードに書いた |
| Phase 3 | Google Cloud Console・Supabase・ローカルPC | Google ログインの仕組みを整えた |
| Phase 4 | Supabase SQL Editor（手動） | テーブル作成・RLS設定 |

### Phase 0：Supabase 事前準備（手動）
- Supabase のサイトでアカウント登録した
- soreata 用プロジェクトを作成した（「使うよ」宣言）
- 発行された URL と APIキーを `.env.local` に書いた
- Supabase は soreata のデータを置く「貸倉庫（データベース）」。自分専用の区画を借りた状態。
- この設定は Supabase ダッシュボードにログインすれば確認できる

### Phase 1：Next.js フレームワーク（ローカルPC）
- `index.html` 1枚だったアプリを Next.js フレームワークの骨格に移した
- Next.js はブラウザ側・サーバー側のコードを同じプロジェクトに書ける道具箱（フレームワーク）
- `index.html` だけではログイン・DB保存・ページ遷移ができないため必要
- ローカルPC は開発・テスト用。完成後は Vercel に自分のコードだけを置く
- Next.js 本体はアップしない。Vercel が自前で持っている

### Phase 2：Supabase 接続口（ローカルPC）
- Supabase に繋ぐコードを 2 種類作った
- `lib/supabase.ts`：ブラウザ側の接続口
- `lib/supabase-server.ts`：サーバー側（Cookieでログイン状態を扱うため別が必要）
- 接続に必要な URL・APIキーは `.env.local` から読む（コードには書かない）

### Phase 3：Google ログインの仕組み（3か所またいだ）

**Google Cloud Console（手動）**
- 既存の Google アカウントでログイン（新規登録ではない）
- soreata アプリを登録した（「このアプリは Google ログインを使います」という申請）
- クライアントID・シークレットが発行された（soreataの証明書）

**Supabase ダッシュボード（手動）**
- クライアントID・シークレットを貼り付けた
- 「このIDを持つアプリからのログインを信用する」という認証設定
- DB へのアクセス権限の設定ではない（それは Phase 4 の RLS）

**ローカルPC・コード（`app/auth/callback/route.ts`）**
- Google でログイン後に soreata に戻ってくる「返事の窓口」（コールバック）
- Google から渡された code を Supabase に渡してセッション（ログイン状態）を作る

**ログインの流れ**
ユーザーが「Googleでログイン」を押す
→ Google のログイン画面へ
→ ログイン成功 → callback へ
→ Supabase がセッション（入館証）を発行
→ soreata の画面に戻る

「Googleでログイン」ボタンはまだ画面にない。仕組みの配線だけが完成した状態。
ボタンは Phase 5 で作る。

### Phase 4：DBテーブル作成（Supabase SQL Editor・手動）

**用語**
- テーブル：データを管理する表（Excelのシート1枚に相当）
- レコード：テーブルの1件のデータ（1行）
- カラム：データの項目（1列）
- フィールド：1つの枠（レコードとカラムの交点）に入っているデータ
- 値（あたい）：フィールドに入っている具体的なデータ。固定ではなく更新できる
- SQL：データベースを操作するための言語（命令文）
- スキーマ：テーブルをまとめるフォルダ。soreata は public スキーマを使う
- RLS（行レベルのアクセス制御）：テーブルを作っただけでは全員のデータが誰にでも見える状態になる。RLS を設定することで「自分のデータしか見られない」にできる
- CRUD：データベース操作の基本セット（Create=INSERT・Read=SELECT・Update=UPDATE・Delete=DELETE）

**作ったテーブル**
- accounts：ログインしたユーザーの情報（email・nickname）
- persons：当人権限者の情報（nickname）
- decompositions：AI分析の結果1件分（task_text・abilities JSON・created_at）
  ※旧称 records。「分解する（decompose）」から命名。APIルート名と統一。

**テーブル作成は SQL Editor で実施**
テーブルエディタでも作れるが、外部キー（テーブル同士のつながり）も含めて SQL で一括作成する方が確実。
- PKはすべて `id`（UUID型）。auth.users.id と合わせる必要があるため id 以外は選択肢なし
- 外部キーも UUID 型で統一（参照先と同じ型でないと比較できない）

**RLS ポリシー：自分のデータだけ操作できる**
- accounts：auth.uid() = id
- persons：auth.uid() = account_id
- decompositions：auth.uid() = created_by

**設定の在り処**
- Supabase の設定 → Supabase ダッシュボード（Authentication → Policies）
- Google の設定 → Google Cloud Console
- APIキー類 → .env.local
- コード → Git にコミット済み

---

## AI分析の保存範囲

日時：2026-06-28

結論：AI分析の全フィールド（title・description・person・solution）をabilities JSONに保存する。
confirmed_at（能力確認日）も同じJSONに持つ。

連動：
- `docs/data_structure.md` abilities JSONスキーマ
- NEXT.md テーブル設計の方針

不採用案：
- タイトルのみ保存：AIの出力は毎回同じにならないため、後から再分析しても同じ結果が得られない。記録を読み返す価値を保つには全文保存が必要。
- analysis_jsonを別カラムに持つ：RECORDSテーブルのabilitiesに統合できるため不要。

※旧方針「AI分析のanalysis_jsonは保存しない。AI分析は「その場で使うもの」。」を撤回する。
状況メモ廃止・観察記録への移行後、記録を積み重ねる設計になったため全文保存が適切と判断。

---

## 年齢入力の設計方針

日時：2026-06-21 20:00

結論：年齢・特徴の専用UIは設けない。
困りごと入力欄への自由記述（任意）とする。
プロンプトに「課題文に年齢や対象者の特徴が示されている場合は、それを考慮して「当人は？」を書く」を追加。
書かない場合の精度は入力側次第として許容する。

不採用案：
- 必須選択UI（固定カテゴリ）：UIが増える。カテゴリの粒度が難しい（未就学児の幅が広い、大学生と成人が重複するなど）。
- 必須UI＋「指定なし」選択肢：指定なし時のプロンプト制御が曖昧になる。
- 「年齢に合う」指示をそのまま残す：年齢情報がないと機能しない矛盾が残る。

---

## AIペルソナ設計

日時：2026-06-16 11:43

結論：ペルソナを「課題分析の研究者」に定義した。
「行動の良し悪しではなく、課題を可能にする認知・感覚・社会的認知・運動の前提条件を特定する」という立場を明示する。

連動：
- `api/decompose.js` buildPrompt の冒頭2行
- `gitignores/index_AItest.html` buildPrompt の冒頭2行

不採用案：
- 「発達支援の専門家」：支援員・療育スタッフなど現場実践者のイメージを含む。「静止させる」「落ち着かせる」など古い支援実践の文脈を引き寄せる。
- 「一般向けに解説する専門家」：「一般向け」という修飾が専門語の平易化・言い換えを促す。前庭覚などの学術語が消える方向に引っ張られる。
- 「行動・認知・感覚・運動の専門家」：「行動」という語が行動分析・行動療法の文脈を呼び込む。望ましい行動の強化・不適切な行動の消去という発想と区別がつかなくなる。
