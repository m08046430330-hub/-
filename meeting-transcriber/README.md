# 会議AI文字起こし

会議を録音しながらリアルタイムで文字起こしし、終了後に高精度な文字起こし（話者の自動識別つき）とAI議事録を作るWebアプリです。
Cloudflare Workers 1つで、画面の配信とAPIの中継をまとめて行います。

## できること

- **リアルタイム文字起こし**：会議中、ブラウザの音声認識で発言を逐次表示
- **高精度文字起こし＋話者識別**：録音終了後、自動で AssemblyAI に送り「話者A／話者B…」付きで書き直し
- **話者名の一括変更**：「話者A」→「田中」のように置き換え
- **AI議事録**：Claude が概要・議題・決定事項・ToDo・保留事項をまとめる
- **保存・書き出し**：ブラウザ内に保存、Markdown / テキスト書き出し、録音ファイルのダウンロード

APIキーはサーバー（Cloudflare）側だけに置き、利用者には「合言葉」を配ります。

## 費用の目安（会議が月20時間の場合）

| 項目 | 月額の目安 |
|---|---|
| Cloudflare Workers | 無料枠で運用可能 |
| AssemblyAI（文字起こし＋話者識別） | 約500〜700円 |
| Anthropic（AI議事録、1会議 約20円） | 約400円 |

## 公開手順（プログラミング不要）

### 1. APIキーを用意する
1. **AssemblyAI**：https://www.assemblyai.com でアカウント作成 → ダッシュボードの「API Keys」でキーをコピー
2. **Anthropic**：https://console.anthropic.com でアカウント作成 → 「Billing」でクレジットを購入（$5程度）→「API Keys」でキーを作成してコピー
3. **合言葉**：利用者に配るパスワードを決める（推測されにくい12文字以上の英数字）

※ キーはチャットやメールに貼らず、次の手順で Cloudflare の画面に直接入力してください。

### 2. Cloudflare に公開する
1. https://dash.cloudflare.com でアカウント作成（無料）
2. 左メニュー「Workers & Pages」→「作成」→「リポジトリをインポート（Import a repository）」
3. GitHub と連携し、このリポジトリを選択
4. 設定画面で次のように入力して「デプロイ」
   - **プロジェクト名**：`meeting-transcriber`
   - **ルートディレクトリ（Root directory）**：`meeting-transcriber`
   - **本番ブランチ**：このアプリが入っているブランチ（例：`claude/meeting-transcriber`）
   - ビルドコマンド：空欄のまま ／ デプロイコマンド：`npx wrangler deploy`
5. デプロイ後、Worker の「設定（Settings）」→「変数とシークレット（Variables and Secrets）」→「追加」で、**種類を「シークレット」にして**次の3つを登録

   | 名前 | 値 |
   |---|---|
   | `APP_PASSCODE` | 決めた合言葉 |
   | `ASSEMBLYAI_API_KEY` | AssemblyAI のキー |
   | `ANTHROPIC_API_KEY` | Anthropic のキー |

6. 表示される `https://meeting-transcriber.＜アカウント名＞.workers.dev` が公開URLです

### 3. 使う
1. Chrome または Edge で公開URLを開く
2. 「⚙ 設定」で合言葉を入力して保存
3. 「● 録音開始」→ マイクを許可 → 会議
4. 「■ 終了」→ 自動で高精度文字起こし（会議の長さの1〜3割ほどの時間）
5. 話者名を必要に応じて変更 →「AIで議事録を作成」

## 注意事項

- 会議を録音する際は、参加者の同意を得てください。
- リアルタイム表示の音声認識は Chrome の機能で、音声は Google のサーバーで処理されます。
  高精度文字起こしでは録音ファイルが AssemblyAI に、議事録作成では文字起こしが Anthropic に送信されます。
- 合言葉を知っている人は誰でもAPIを利用できます（費用が発生します）。担当者が替わったら合言葉を変更してください。
- 高精度文字起こしは録音直後のみ実行できます（録音ファイルはサーバーに保存されません）。必要なら音声をダウンロードしておいてください。
- AssemblyAI と Anthropic の管理画面で、利用額の上限やアラートを設定しておくと安心です。

## 開発者向け

```sh
cd meeting-transcriber
npm install
npm test        # Worker の単体テスト
# .dev.vars に APP_PASSCODE / ASSEMBLYAI_API_KEY / ANTHROPIC_API_KEY を記入
npm run dev     # http://localhost:8787
```

- `public/`：画面（HTML / CSS / JS）
- `src/worker.js`：API中継（`/api/check`、`/api/transcripts`、`/api/summary`）
