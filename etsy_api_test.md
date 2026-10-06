# Etsy API 接続テスト結果（2回目）

- 実行日時: 2026-10-06 01:30 UTC（日本時間 2026-10-06 10:30）
- 実行環境: クラウドのセッション（認証ヘッダーは環境のプロキシが自動で付与）
- 前提: 1回目（01:16 UTC）の 403 を受けて、店主が環境の Etsy 認証情報（`openapi.etsy.com` 宛て、ヘッダー `x-api-key`）を作り直した後の再テスト
- 方針: 読み取り（GET）のみ。Etsy・Printify のデータは一切変更していない
- 結論: **Etsy API は今回も認証エラー（HTTP 403）。エラー内容は1回目とまったく同じ。** Printify API は正常（HTTP 200）

## 各手順の結果

| # | 手順 | 結果 |
|---|------|------|
| 1 | `GET /v3/application/openapi-ping` | ❌ HTTP 403 |
| 2 | `GET /v3/application/shops?shop_name=420WEEDIOVESHOP` | ❌ HTTP 403（ショップ情報は取得できず） |
| 3 | `GET /v3/application/shops/{shop_id}/listings/active?limit=100` | ⏭ 実行せず（手順 2 で shop_id が取れなかったため） |
| 4 | `python3 tools/etsy_stats.py --log etsy_stats_log.csv` | ❌ Printify からの出品 ID 取得は成功、Etsy の `listings/batch` で HTTP 403 になり終了（exit 1）。CSV は作成されていない |
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

## 考えられる原因

Etsy は「`x-api-key` の値が `keystring:shared_secret` の形式になっていない」と返している。1回目と同じ文言なので、作り直した値がまだ Etsy に届いていないか、届いた値にまだ問題があると考えられる。

1. **このセッションが作り直し前の認証情報のまま動いている**（可能性が高い）
   - このセッションのコンテナは作り直しの前に起動しており、環境設定の変更は起動中のセッションに反映されないことがある。
   - → **新しいセッションを開始して** 再テストするのが最初の確認。
2. **値の形式がまだ違う**
   - `:` と Shared secret が抜けている（Keystring だけ）、前後に空白・改行・引用符が入っている、`x-api-key:` という文字まで値に入れてしまっている、など。
   - 値は Etsy の「Your apps」画面の **Keystring** と **Shared secret** を `:` でつないだものだけにする（例の形: `abcd1234...:efgh5678...`）。
3. **宛先ホストやヘッダー名の違い**
   - ホストが `openapi.etsy.com`、ヘッダー名が `x-api-key` になっているか。
   - なお、1回目の切り分けで、わざとダミー値を送ると別のエラー（`API key not found or not active...`）になったので、今のエラーは「キーの中身が違う」ではなく「形式が違う／`:` が無い」ことを示している。

プロキシが付ける値はこの環境からは見えないため、上のどれなのかはここからは判別できない。
tools/etsy_stats.py はコードの不具合ではない（Printify の取得は成功し、Etsy 側の認証で止まっている）ため、修正していない。

## 対処案

1. 新しいセッションを開始して、同じテストを再実行する
2. それでも同じエラーなら、環境設定の Etsy 認証情報を開き、値が `Keystring:Shared secret` だけになっているか（空白・改行・引用符・ヘッダー名が混ざっていないか）確認して保存し直す
3. Etsy の「Your apps」でアプリの状態が有効（Active）であることも確認する

## ショップ情報

取得できず（手順 2 が 403）。shop_id、shop_name、title、announcement、is_vacation、listing_active_count、num_favorers、currency_code は次回の再テストで確認する。

## 出品ごとの情報

閲覧数・お気に入り数・価格・在庫数・状態は Etsy から取得できなかった。Printify（ショップ 29108577）から読み取れた、Etsy に公開済みの出品は次の 6 件:

| Etsy 出品 ID | 商品名（Printify 上） | 状態 | 閲覧 | お気に入り | 価格 | 在庫 |
|---|---|---|---|---|---|---|
| 4585522299 | Kanji Cannabis Love T-Shirt \| Taima Ai Japanese Calligraphy Tee \| 420 Hanko Back Print, Stoner Gift, Weed Streetwear, Black or White | – | – | – | – | – |
| 4585491734 | Kanji Black Mug \| Taima Ai Cannabis Love Japanese Calligraphy Coffee Cup \| 420 Stoner Gift, Weed Lover Mug, 11oz | – | – | – | – | – |
| 4585451765 | Rose Bouquet Tote Bag \| Colorful Roses & Vinyl Record Player Art \| Cotton Canvas Market Bag, Music Lover Gift | – | – | – | – | – |
| 4584786176 | Japan Weed Love Shop T-Shirt \| 420 Cannabis Leaf, Grinder & Bong Graphic Tee \| Stoner Gift, Japan Streetwear | – | – | – | – | – |
| 4584546414 | 420 Leaf Mug, Ink Splatter Cannabis Leaf Coffee Cup, Hand Lettered Ceramic Mug, Stoner Gift, Red and Black Leaf Art, 11oz | – | – | – | – | – |
| 4583938426 | 420 Stoner Cats T-Shirt \| Cannabis Leaf Back Print, Japan Flag Sleeve \| Funny Cat Lover Gift \| Marijuana Graphic Tee \| Japanese Streetwear | – | – | – | – | – |

## etsy_stats_log.csv について

スクリプトが Etsy の取得で止まったため、記録ファイルは作成されていない（空のファイルや作り物のデータは作らなかった）。
