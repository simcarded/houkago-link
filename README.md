# 放課後Link

愛知県を題材とした学習場所のプロトタイプです。施設・企業・地域統計はすべて発表用の仮想データであり、実在する施設の利用や契約を示しません。

公開: https://houkago-link.pages.dev / 発表: https://houkago-link.pages.dev/demo

## 現在の状態

施設・地域データは Cloudflare D1 に保存しています。検索、地図、地域比較、施設提供シミュレーション、発表モード、ブラウザ内のデモ予約を使用できます。Google OAuth は未設定で、実ユーザーの予約保存と管理画面は利用できません。Workers AI は無料枠の確実な保護が整うまで無効で、ルールベースの代替検索を表示します。地図やフォントは通信が必要な場合があります。

## 開発

Node.js 22 以降を使用します。

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

`development` がPagesの本番ブランチです。Direct UploadのためGitHubへのpushだけでは自動公開されません。型検査、lint、単体・E2Eテストとビルド後に、対象アカウントを確認して `npx wrangler pages deploy dist --project-name houkago-link --branch development` を実行します。過去のデプロイへのロールバックはCloudflare Pagesのデプロイ一覧から行えます。D1のデータはロールバックされません。`main` への変更には事前確認が必要です。

## 検証と制約

2026-11-16: TypeScript・ESLint・Vitest 4件・Playwright 9件は通過。公開URLで検索画面、地域比較と提供シミュレーション、プレゼン画面を3画面サイズで確認しました。OAuth、実ログインによる予約、APIの負荷・同時実行試験、Lighthouse、完全オフラインは未検証です。施設の新規登録は非公開で作られます。実運用には認証、予約の入力検証、安全管理、保護者連絡、個人情報と施設管理の再検討が必要です。

Cloudflare Workers Free は日次リクエスト数、D1は行の読み書きと保存容量の上限をアカウント内で共有します。上限到達時は利用できなくなります。既存の他プロジェクトにも影響し得るため、利用量をCloudflare画面で確認してください。
