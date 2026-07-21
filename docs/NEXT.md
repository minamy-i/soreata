# NEXT

更新：2026-07-21
push：2026-07-21 21:15

## 次にやること

- [x] APIルート3箇所（`invite`・`account/delete`・`post-webhook`）の認証チェック重複を整理
  - `lib/require-member.ts`に`requireApiSession(supabase)`を追加（既存の`requireSession`と同じくsupabaseは呼び出し側で渡す形に揃える）
  - 戻り値は判別可能ユニオン型（`{ok:true, session} | {ok:false, response}`）にする
  - 3箇所すべてを置き換える
- [x] `requireApiSession()`（`lib/require-member.ts`）を`getSession()`から`getUser()`に変更
  - 3箇所とも統一する（理由はdocs/NOTES.md参照。`account/delete`のみadminクライアントに直結しており危険度が高い）
  - 呼び出し側（3ルート）の変更は無し
- [x] `proxy.ts`（Next16で`middleware.ts`から名称変更。docs/NOTES.md参照）による2枚目の壁を追加
  - `lib/supabase-middleware.ts`新設、`/api/*`を対象に`getUser()`チェック、`decompose`のみ除外
  - 動作確認済み（保護3ルート401、decomposeは通過して400）

任意（今回は対応せず）：`app/layout.tsx`のカスタムフォント（Hachi Maru Pop）警告。
`next/font/google`はこのフォントの日本語サブセットを提供していないため単純差し替え不可。
`next/font/local`でフォントファイル（OFLライセンスにつき同梱可・確認済み）を自前ホスティングすれば日本語表示を保ったまま警告解消可能だが、今回はその手間をかけるほどではないと判断し見送り。フォント自体（`.global-nav-brand`・`h1`）は変更しない。

- [ ] 当人権限（owner）移譲（指名・/account受諾・受諾RPC）：後回し（2026-07-06、着手前確認で保留）
  - 着手前に要確認・未回答：
    - 移譲が承諾されると、旧当人権限者はそのチームからどうなるか（NOTES.mdの記述では「旧owner行もrevoked_at」＝チームから完全に外れる、となっているが、実際の挙動として影響が大きいため再確認が必要）
    - 当人権限の移譲先の指名は、1チームにつき同時に1件のみ（既存の保留を取り消してから次を指名）にするか、複数人へ同時に指名できるようにするか
  - アプリ全体（招待・投稿まで）が動いてから着手
  - UI詳細（指名の場所・表示）は着手前に相談
- [ ] 中身があるチームの削除
  - 記録・協力者を全て消して空にしてから削除する方式（却下はしない。docs/SPEC.md「中身があるチームの削除」参照）
  - 協力者の除名手段（現状は招待の取消のみ）の設計が必要。最も重いため最後
