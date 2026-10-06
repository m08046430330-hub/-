# Etsy API 接続テスト結果（3回目）

- 実行日時: 2026-10-06 01:38 UTC（日本時間 2026-10-06 10:38）
- 実行環境: クラウドのセッション（コンテナ起動 01:37 UTC ＝ 認証情報の登録し直し後に新しく起動したセッション。認証ヘッダーは環境のプロキシが自動で付与）
- 前提: 2回目（01:30 UTC）までの 403 を受けて、店主が環境の Etsy 認証情報（`openapi.etsy.com` 宛て、ヘッダー `x-api-key`、値 `keystring:shared_secret`）を登録し直した後の再テスト
- 方針: 読み取り（GET）のみ。Etsy・Printify のデータは一切変更していない
- 結論: **Etsy API は3回目も認証エラー（HTTP 403）。エラー文は1・2回目とまったく同じ。** Printify API は正常（HTTP 200）

## 各手順の結果

| # | 手順 | 結果 |
|---|------|------|
| 1 | `GET /v3/application/openapi-ping` | ❌ HTTP 403 |
| 2 | `GET /v3/application/shops?shop_name=420WEEDIOVESHOP` | ❌ HTTP 403（ショップ情報は取得できず） |
| 3 | `GET /v3/application/shops/{shop_id}/listings/active?limit=100` | ⏭ 実行せず（手順 2 で shop_id が取れなかったため） |
| 4 | `python3 tools/etsy_stats.py --log etsy_stats_log.csv` | ❌ Printify からの出品 ID 取得（6件）は成功、Etsy の `listings/batch` で HTTP 403 になり終了（exit 1）。CSV は作成されていない |
| 5 | 本ファイルの更新 | ✅ |

参考: Printify の `GET /v1/shops.json`（`User-Agent: printify-price-script`）は HTTP 200 で正常。

### エラー全文

手順 1・2（curl、ヘッダーは付けずプロキシの自動付与に任せた）:

```
{"error":"Invalid API key: should be in the format 'keystring:shared_secret'."}
```

手順 4（tools/etsy_stats.py）:

```
APIエラー 403 (https://openapi.etsy.com/v3/application/listings/batch?listing_ids=4585522299,4585491734,4585451765,4584786176,4584546414,4583938426): {"error":"Invalid API key: should be in the format 'keystring:shared_secret'."}
```

## 原因の切り分け

1. **「古いセッションのまま」は原因ではない**
   - 今回のコンテナは 01:37 UTC 起動で、登録し直しの後に始まった新しいセッション。それでも同じエラーなので、環境に保存されている値そのものが Etsy に「形式が違う」と判定されている。
2. **プロキシが値を上書きしていることを確認**
   - 切り分けとして、正しい形式のダミー値（`ダミー:ダミー`）を自分でヘッダーに付けて ping を送ったところ、ダミー値用のエラー（キーが見つからない）ではなく**同じ「形式が違う」エラー**が返った。
   - つまりこちらが付けたヘッダーはプロキシが環境の値で置き換えており、Etsy に届いているのは環境に保存された値。その値に `:` が無い（または余計な文字が混ざっている）と考えられる。
3. **よくある入力ミス**（値はこの環境から見えないため、どれかは判別できない）
   - Keystring だけで `:Shared secret` が抜けている
   - 前後に空白・改行・引用符（`"`）が入っている
   - `x-api-key:` などのヘッダー名まで値に入っている
   - 全角のコロン（`：`）になっている
   - 認証方式が「Bearer トークン」等になっていて、`Bearer ` が前に付いて送られている（ヘッダー `x-api-key` に値をそのまま入れる方式になっているか）

tools/etsy_stats.py はコードの不具合ではない（Printify の取得は成功し、Etsy 側の認証で止まっている）ため、修正していない。

## 対処案

1. 環境設定（セッションのタイトルバーのクラウド環境メニュー → Edit）で Etsy の認証情報を開き、
   - ホスト: `openapi.etsy.com`
   - ヘッダー名: `x-api-key`
   - 値: Etsy「Your apps」画面の **Keystring** と **Shared secret** を半角 `:` でつないだものだけ（空白・改行・引用符・`Bearer`・ヘッダー名を含めない）
   になっているか確認し、一度削除して入れ直す
2. Etsy の「Your apps」でアプリの状態が有効（Active）であることを確認する
3. 保存後、**新しいセッション**を開始して同じテストを再実行する

## ショップ情報

取得できず（手順 2 が 403）。shop_id、shop_name、title、announcement、is_vacation、listing_active_count、num_favorers、currency_code、url は次回の再テストで確認する。

## 出品ごとの情報

取得できず（Etsy API が 403）。参考として、Printify 側で Etsy に紐づいている出品 ID は次の6件（PROGRESS.md の商品一覧と一致）:

| Etsy 出品 ID | 商品 |
|---|---|
| 4585522299 | 漢字 Cannabis Love Tシャツ（白・黒） |
| 4585491734 | 漢字 黒マグ |
| 4585451765 | ローズブーケ トート |
| 4584786176 | Japan Weed Love Shop Tシャツ |
| 4584546414 | 420 リーフマグ（白） |
| 4583938426 | 420 Stoner Cats Tシャツ |
