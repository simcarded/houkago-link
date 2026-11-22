# 放課後Link

愛知県を題材とした学習場所のプロトタイプです。施設・企業・地域統計はすべて発表用の仮想データであり、実在する施設の利用や契約を示しません。

公開: https://houkago-link.pages.dev / 発表: https://houkago-link.pages.dev/demo

## 提供ソースの範囲

添付Markdownのファイル別コードを基に構築し、不足分や実行上の問題を補っています。提供されたMarkdownは `TECH_STACK.md` の表の途中で終わっており、それ以降に記載予定だった内容は確認できません。現在の技術選定文書は、確認できた内容と実装を基に整備したもので、欠落部分の完全な復元ではありません。

## 現在の状態

施設・地域データは Cloudflare D1 に保存しています。検索、地図、地域比較、施設提供シミュレーション、発表モード、ブラウザ内のデモ予約を使用できます。Google OAuth はテストモードで、所有者アカウントの予約保存、キャンセル、施設情報の編集と、別アカウントでのログインを確認しました。Googleの公式説明では基本識別スコープのみの場合、テストユーザーリスト外もアクセスできる例外があります。Workers AIは使わず、端末内のキーワード抽出で検索します。一度オンラインで発表画面を開くと、対応ブラウザでは画面とデモデータを保存し、通信断後も再表示できます。地図タイルとフォントは通信が必要な場合があり、通信断では簡易地図や代替フォントを使用します。API・認証情報はキャッシュしません。

## 開発

Node.js 24を使用します。

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

環境変数や秘密情報をリポジトリに保存しないでください。`wrangler.toml` のD1 IDはこのプロジェクト専用です。移行する際は自分のD1 IDに変更してください。

## 発表

`/demo` で5段階を順に操作します。矢印キーで移動し、初期化ボタンでデモ予約とシミュレーションを消去できます。発表前に通信環境と地図表示を確認してください。架空の地域統計を実際の格差の証拠として扱わないでください。

## デプロイ

`development` がPagesの本番ブランチです。既存のDirect Uploadプロジェクトを維持し、`.github/workflows/ci.yml` の型検査・lint・単体テスト・E2Eテスト・ビルドのすべてが成功した `development` へのpushから、Wranglerで自動公開する構成を用意しました。PR・`main`・他ブランチからは本番公開しません。テスト済みコミットが最新の `development` でない場合もスキップします。

**自動デプロイは初期状態で無効。** Cloudflareの対象アカウントに対し **Account / Cloudflare Pages / Edit** のみを許可したAPIトークンを作成してから、GitHubの **Settings → Secrets and variables → Actions** に以下を登録してください。トークンはソースやチャットへ貼らないでください。

- Repository secrets: `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`
- Repository variable: `CLOUDFLARE_PAGES_AUTO_DEPLOY=enabled`（最後に設定）

有効化後、次の `development` へのpushがCIを通った場合のみ本番デプロイされます。過去の成功runは変数の設定だけでは再実行されません。手動公開の代替手順は `npx wrangler pages deploy dist --project-name houkago-link --branch development` です。CIはD1のマイグレーションを自動実行しません。停止時は変数を無効化します。過去のデプロイへのロールバックはCloudflare Pagesのデプロイ一覧から行えますが、D1のデータはロールバックされません。`main` への変更には事前確認が必要です.

## 検証と制約

2026-11-17、コミット 75a7513: TypeScript・ESLint・Vitest 19件が成功。Playwrightはローカルで52件成功、オフライン再表示の2件をスキップしました。APIを模擬したテストを含みます。公開URLで主要画面、端末内検索、所有者アカウントで予約変更・指定日時の空席を確認しました。Chromiumで初回読み込み後の発表画面のオフライン再表示を確認しました。Lighthouseは以前のデプロイで参考測定済みです。公開APIの負荷・同時実行試験と初回アクセス時の完全オフラインは未検証です。施設の新規登録は非公開で作られます。実運用には安全管理、保護者連絡、個人情報と施設管理の再検討が必要です。

Cloudflare Workers Free は日次リクエスト数、D1は行の読み書きと保存容量の上限をアカウント内で共有します。上限到達時は利用できなくなります。既存の他プロジェクトにも影響し得るため、利用量をCloudflare画面で確認してください。

詳細は [テスト結果](./TEST_REPORT.md) と [発表手順](./DEMO_GUIDE.md) を参照してください。

[システム構成とD1](./ARCHITECTURE.md)・[セキュリティとデータの扱い](./SECURITY.md)も参照してください。
