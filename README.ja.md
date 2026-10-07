# mHungry

[English](README.md) | 日本語

mHungry は、家庭の食品在庫を管理するモバイルファーストの Web アプリです。認証、在庫・使用履歴、レシート／食品／賞味期限のスキャン、在庫を考慮したレシピ生成と Web 検索、期限通知、Web プッシュ、PWA 対応まで、フェーズ 1〜5 の機能を実装しています。画面表示は英語と日本語を切り替えられます。

AI の結果はあくまで候補です。スキャンした値は、保存前に必ずユーザーが確認してください。賞味期限や消費期限だけで食品の安全性を判断することはできません。

## 技術スタック

- Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4
- Supabase PostgreSQL、Auth、非公開 Storage、RLS
- サーバールート経由の Gemini Interactions API（`USE_MOCK_AI` フォールバック対応）
- Zod、React Hook Form に対応したフォーム構成、Lucide アイコン、Vitest
- PWA マニフェストと安全性を重視したオフライン Service Worker
- Vercel 対応のデプロイ構成

## このマイルストーンで実装済みの機能

- 公開ランディングページ、メール／パスワードによる登録・ログイン・ログアウト、セッションの永続化
- 公開ページと認証済みページでの英語／日本語切り替え、Cookie への保存、認証済みプロフィールとの同期
- 保護されたアプリケーションルートグループとユーザー単位のクエリ
- 在庫の作成・参照・更新・削除、検索、保管場所フィルター
- 期限状態の表示：期限切れ、本日、明日、3 日以内、安全、期限未設定
- PostgreSQL 関数による使用履歴の記録と在庫数量のアトミックな減算
- ダッシュボードでの有効在庫数、期限サマリー、最近追加した食品、本日の使用量、廃棄金額の表示
- 背面カメラ／ギャラリーに対応した再利用可能な画像取得、リサイズ、権限・エラー表示
- `{userId}/{year}/{month}/{uuid}.jpg` 形式での非公開レシート画像アップロード
- サーバー内のみで行う Gemini レシート解析と、安全な日本語モックフォールバック
- 店舗、日付、合計、元の OCR 商品名、正規化名、数量、単位、価格の編集
- レシート、購入、購入商品、選択した在庫項目のアトミックな登録
- 購入履歴と詳細表示
- 初期データベーススキーマ、インデックス、外部キー、RLS、非公開バケットポリシー、RPC
- 重要なビジネスルール、PWA シェル、プライバシー／安全性表示のテスト
- 食品画像認識、賞味期限ラベル抽出、Zod 検証、明示的な確認画面
- 在庫を考慮した AI レシピ、不足食材の表示、履歴保存、調理時の確認付き在庫減算
- 在庫の優先設定、食材候補、短い要約、元サイトへのリンクを備えた専用 Web レシピ検索
- アプリ内通知、FCM デバイス登録／解除、通知設定、保護された日次 Cron

## ローカルセットアップ

必要環境：Node.js 20.9 以上、pnpm 10 以上。

```bash
git clone <repository-url>
cd <repository-folder>
pnpm install
cp .env.example .env.local
pnpm dev
```

Windows PowerShell では、`cp` の代わりに次のコマンドも使用できます。

```powershell
Copy-Item .env.example .env.local
```

[http://localhost:3000](http://localhost:3000) を開きます。

## Supabase のセットアップ

1. Supabase プロジェクトを作成します。
2. Supabase CLI を実行し、ログインしてプロジェクトをリンクします。

```bash
pnpm dlx supabase@latest login
pnpm dlx supabase@latest link --project-ref YOUR_PROJECT_REF
pnpm dlx supabase@latest db push
```

Supabase を完全にローカルで動かす場合：

```bash
pnpm dlx supabase@latest start
pnpm dlx supabase@latest db reset
```

初期マイグレーションでは、スキーマ、RLS、バケット、ポリシーを作成します。`20260901020407_phase_3_5_features.sql` マイグレーションでは、レシピ用インデックスと、認証を伴うレシピ使用量のアトミック処理関数を追加します。すべてのマイグレーションは `pnpm dlx supabase@latest db push` で適用してください。画像用バケットは、どちらも公開設定にしないでください。

Supabase Dashboard → Authentication → URL Configuration で次を設定します。

- **Site URL** に `https://mhungry.vercel.app` などの本番 URL を設定します。
- **Redirect URLs** に `https://mhungry.vercel.app/**` と `http://localhost:3000/**` を追加します。
- 必要に応じて、Vercel プレビュー用に `https://*-your-team-slug.vercel.app/**` を追加します。

Vercel では、`NEXT_PUBLIC_SITE_URL` を本番 URL に設定します。ローカル開発では `http://localhost:3000` を使用してください。

このプロジェクトは、Supabase がホストする標準の確認メールテンプレートを変更せずに使用できます。登録時は implicit 方式のメール確認フローを要求します。ブラウザーの `/auth/confirm` コールバックが返されたセッションを検証し、安全な Supabase Cookie に保存して `/dashboard` にリダイレクトします。このコールバックは、旧形式の PKCE リンクにも対応しています。

カスタム SMTP を設定し、トークンハッシュ形式のテンプレートを使用する場合は、Authentication → Email Templates → Confirm signup の確認リンクを次のように変更します。

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">
  メールアドレスを確認
</a>
```

`/auth/confirm` ページは、implicit、PKCE、token-hash の各コールバック形式に対応しています。アクセストークンやリフレッシュトークンをログまたはサーバーレンダリングされたページ出力に含めないでください。

### 本番環境での確認メール配信

Supabase の標準メールサービスは、初期テスト専用です。Supabase 組織のメンバーになっているメールアドレスにしか送信できず、認証メールは 1 時間あたり 2 通に制限されます。一般のテストユーザーを登録するには、次の設定を行います。

1. Resend、Postmark、SendGrid、Amazon SES、Brevo などで SMTP 認証情報を作成します。
2. Supabase Dashboard → Authentication → Emails → SMTP Settings を開きます。
3. カスタム SMTP を有効にし、送信元アドレス、ホスト、ポート、ユーザー名、パスワードを入力します。
4. **Confirm email** を有効にしたままにします。
5. 新しいアカウントを 1 件登録し、最新の確認リンクを使用します。

アプリは、許可されていない送信先アドレスと、標準メールサービスのレート制限に対して個別のエラーを表示します。

Project Settings → API の値を `.env.local` にコピーします。

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

ブラウザーでは anon／publishable キーだけを使用します。RLS がデータ保護の境界です。service-role／secret キーは、複数ユーザーを検索する保護済み通知 Cron だけがサーバー側で使用します。

## 言語対応

ヘッダー、サイドバー、認証ページ、または Settings にある **EN / 日本語** ボタンで言語を切り替えられます。選択した言語は `foodtrack-locale` Cookie に保存され、サーバーレンダリングにも直ちに反映されます。ログイン中は、通常の RLS 保護済み Supabase セッションを使用して `profiles.language` も更新します。管理者キーは使用しません。

翻訳は `src/lib/i18n/dictionaries.ts` にあります。データベースの enum 値とルートパスは言語に依存しないため、表示言語を変更しても在庫データが複製または書き換えられることはありません。日付と通貨は、選択した言語設定で表示されます。

## Gemini とモックモード

開発環境では、レシート、食品、期限ラベル、生成レシピ、Web レシピ検索について、再現可能なサンプル結果を標準で使用します。

```text
USE_MOCK_AI=true
```

実際の AI 解析を使う場合：

```text
USE_MOCK_AI=false
GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=gemini-2.5-flash
```

Gemini は、認証済みのサーバールートからのみ呼び出されます。Interactions API では構造化 JSON スキーマとマルチモーダル画像入力を使用します。レシピ検索では、Gemini が短い要約を作成する前に、Google Search のグラウンディング引用として返された URL だけを受け入れます。署名付き画像 URL は 60 秒で失効し、リクエストは 45 秒でタイムアウトします。不正な構造化レスポンスは 1 回だけ再試行し、画像や秘密情報をログに保存しません。`GEMINI_API_KEY` は `.env.local` または Vercel Environment Variables に設定してください。Settings ページや `NEXT_PUBLIC_` で始まる変数には設定しないでください。

Gemini の無料枠には利用制限があります。また Google は、無料枠のコンテンツを製品改善に使用する場合があると説明しています。実際のレシートや食品画像を処理する前に、最新の Google AI 利用規約を確認してください。画像を Gemini に送信したくない場合は、`USE_MOCK_AI=true` のまま使用してください。

## Firebase Cloud Messaging

1. Firebase プロジェクトと Web アプリを作成します。
2. Cloud Messaging を有効にし、Web Push 証明書／VAPID キーを作成します。
3. `.env.example` に記載されたすべての `NEXT_PUBLIC_FIREBASE_*` 値を設定します。
4. Firebase Admin サービスアカウントを作成し、`FIREBASE_ADMIN_PROJECT_ID`、`FIREBASE_ADMIN_CLIENT_EMAIL`、`FIREBASE_ADMIN_PRIVATE_KEY` をサーバー専用の秘密情報として設定します。
5. 再デプロイ後、Settings から現在のデバイスを有効にします。非対応ブラウザーや通知を拒否したブラウザーでも、アプリ内通知レコードは利用できます。

## LINEログインとプッシュメッセージ

このコードベースには、オプションのLINE連携基盤が含まれています。SupabaseのカスタムOIDCログイン、既存メールユーザーへの安全なアカウント連携、署名検証付きの友だち追加／ブロックWebhook、ユーザーごとの通知許可、テスト送信、期限通知CronからのLINE配信に対応します。設定が完了するまでは画面に表示されません。

1. LINE Developersでプロバイダーを作成し、同じプロバイダー内に **LINEログイン** チャネルと **Messaging API** チャネルを作成します。同じユーザーIDを取得するため、必ず同じLINEプロバイダーを使用してください。
2. LINEログインチャネルの **基本設定 → リンクされたLINE公式アカウント** で、公式アカウントを連携します。
3. Supabase Dashboardの **Authentication → Providers → New Provider** を開き、**Auto-discovery (OIDC)** を選択して次を設定します。
   - Identifier：`custom:line`
   - Issuer：`https://access.line.me`
   - Client ID／secret：LINEログインチャネルのChannel IDとChannel secret
   - Scopes：`openid profile`
   - Email optional：有効（LINEからemailスコープの利用承認を得ている場合を除く）
4. Supabaseに表示される読み取り専用Callback URLを、LINEログインチャネルの **Callback URL** に登録します。PKCEは有効のままにします。
5. Supabase Authentication設定で手動ID連携を有効にします。既存のメールユーザーは通常どおりログインして、**設定 → LINEアカウントを連携** を使用してください。重複アカウントの作成を防げます。
6. `pnpm dlx supabase@latest db push` で最新のマイグレーションを適用します。
7. ローカル環境とVercelに次の変数を追加します。

```dotenv
NEXT_PUBLIC_LINE_LOGIN_ENABLED=true
NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL=https://lin.ee/your-add-friend-id
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=your-long-lived-channel-access-token
LINE_MESSAGING_CHANNEL_SECRET=your-messaging-channel-secret
```

8. Messaging APIのWebhook URLを `https://your-domain.example/api/line/webhook` に設定し、Webhookを有効にしてLINE Developersの **検証** を実行します。
9. 再デプロイ後、LINEでログインまたは連携し、公式アカウントを友だち追加して、設定画面からLINE通知を有効にしてテスト送信します。

Webhookは、リクエスト本文を変更する前に `x-line-signature` を検証します。LINEユーザーIDと友だち状態はサーバー側で管理され、ブラウザーからは自分の連携レコードの読み取りだけが許可されます。

## 環境変数

`.env.example` を参照してください。公開変数は、秘密情報を含まないブラウザー設定だけです。Gemini、Firebase Admin、LINEチャネル認証情報、Cron、Supabase service-role の秘密情報に `NEXT_PUBLIC_` プレフィックスを付けないでください。

## 検証

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Vercel へのデプロイ

1. リポジトリを Vercel にインポートします。
2. Project Settings → Environment Variables で、`.env.example` に記載された必要な変数を追加します。ローカル専用または古い秘密情報が含まれる可能性があるため、`.env.local` 全体をそのまま貼り付けないでください。
3. 本番 URL を Supabase Authentication の Redirect URLs に追加します。
4. 標準の Next.js ビルドコマンドでデプロイするか、次を実行します。

```bash
pnpm dlx vercel@latest login
pnpm dlx vercel@latest
pnpm dlx vercel@latest --prod
```

`vercel.json` は、`/api/cron/expiration-reminders` を毎日 00:00 UTC に実行します。Vercel に十分強い `CRON_SECRET` を追加してください。Vercel Cron は `Authorization: Bearer $CRON_SECRET` として送信します。サーバー専用の Supabase service-role または secret キーも追加します。このエンドポイントは、Vercel 用の GET と、Supabase Cron／手動確認用の POST に対応しています。

## セキュリティに関する注意事項

- ユーザー所有のすべてのテーブルに、select、insert、update、delete 用の RLS ポリシーがあります。
- すべての更新処理で `auth.uid()` による所有者確認を行い、複数レコードにまたがるレシート登録と使用量更新は PostgreSQL 内でアトミックに実行します。
- Storage は非公開です。ファイルサイズは 15 MB 以下、許可された画像 MIME タイプだけに制限し、パスの先頭が認証済みユーザー ID と一致する場合だけアクセスできます。
- レシート入力はスキーマ検証とレート制限を行います。インメモリのレートリミッターは MVP 用の抽象化であり、本番のマルチリージョン環境では Redis／Upstash への置き換えを推奨します。
- Service Worker は非公開 API レスポンスをキャッシュしません。
- 依存関係のロックファイルを確認し、プラットフォームのシークレットスキャンを有効にしてください。

## 既知の制限事項

- 実際のAI、FCM、LINE配信には外部サービスの認証情報が必要です。認証情報がない場合でも、モックAIとアプリ内通知のフォールバックを使用できます。
- HEIC は、ブラウザーが正しい MIME タイプを送信する場合は Storage で受け付けますが、ブラウザーによってデコード対応が異なります。デコードできない場合、撮影コンポーネントが JPEG／PNG の使用を案内します。
- レシート抽出の精度は、照明、切り抜き、レシートのレイアウト、使用モデルに依存します。通常、レシートには賞味期限や消費期限は記載されていません。
- レートリミッターはサーバープロセス単位です。Storage ポリシーによる画像削除は可能ですが、レシート専用の削除 UI は今後の対応です。
- オフラインモードは安全なアプリケーションシェルだけを提供します。非公開の在庫データや API データは意図的にキャッシュしません。

## 起動コマンド

```bash
pnpm install
cp .env.example .env.local
# Supabase の変数を設定してから実行：
pnpm dev
```
