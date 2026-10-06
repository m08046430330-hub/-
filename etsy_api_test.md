# Etsy API 接続テスト結果

- 実行日時: 2026-10-06 01:16 UTC（日本時間 2026-10-06 10:16）
- 実行環境: クラウドのセッション（認証ヘッダーは環境のプロキシが自動で付与）
- 方針: 読み取り（GET）のみ。Etsy・Printify のデータは一切変更していない
- 結論: **Etsy API は認証エラー（HTTP 403）で、すべての手順が失敗。** Printify API は正常に読み取れた

## 各手順の結果

| # | 手順 | 結果 |
|---|------|------|
| 1 | `GET /v3/application/openapi-ping` | ❌ HTTP 403 |
| 2 | `GET /v3/application/shops?shop_name=420WEEDIOVESHOP` | ❌ HTTP 403（ショップ情報は取得できず） |
| 3 | `python3 tools/etsy_stats.py --log etsy_stats_log.csv` | ❌ Printify からの出品 ID 取得は成功、Etsy の `listings/batch` で HTTP 403 になり終了（exit 1）。CSV は作成されていない |
| 4 | 本ファイルの作成 | ✅ |

### エラー全文

手順 1・2（curl、ヘッダーは何も付けずプロキシの自動付与に任せた場合）:

```
{"error":"Invalid API key: should be in the format 'keystring:shared_secret'."}
```

手順 3（tools/etsy_stats.py）:

```
APIエラー 403 (https://openapi.etsy.com/v3/application/listings/batch?listing_ids=4585522299,4585491734,4585451765,4584786176,4584546414,4583938426): {"error":"Invalid API key: should be in the format 'keystring:shared_secret'."}
```

参考（切り分け用）: わざとダミー値 `x-api-key: dummy` を付けて ping した場合は、別のエラーになった:

```
{"error":"API key not found or not active, or incorrect shared secret for API key."}
```

## 考えられる原因

- Etsy に届いている `x-api-key` の値が **`キーストリング:共有された秘密` の形式になっていない**（Etsy がそう返している）。
  - 環境に登録した値が キーストリングだけ（`:` と共有された秘密が抜けている）、または余分な空白・改行・引用符が入っている可能性が高い。
  - もしくは、環境の認証情報が `openapi.etsy.com` 宛てに付与されていない（ヘッダー名の違いなど）可能性もある。どちらなのかはこの環境からは判別できない（プロキシが付ける値は見えないため）。
- tools/etsy_stats.py のコードの不具合ではない（Printify の取得は成功しており、Etsy 側の認証で止まっている）ため、スクリプトは修正していない。

## 対処案

1. claude.ai のこの環境の設定で、`openapi.etsy.com` 用の認証情報を確認する
   - ヘッダー名: `x-api-key`
   - 値: Etsy の「Your apps」画面にある **Keystring** と **Shared secret** を `:` でつないだもの（例の形: `abcd1234...:efgh5678...`）。前後の空白や引用符は入れない
2. Etsy の「Your apps」でアプリの状態が有効（Active）であることも確認する
3. 新しいセッションで本テストを再実行する

## ショップ情報

取得できず（手順 2 が 403）。shop_id、title、announcement、is_vacation、listing_active_count、num_favorers、currency_code などは次回の再テストで確認する。

## 出品ごとの情報

閲覧数・お気に入り数・価格・状態は Etsy から取得できなかった。Printify（ショップ 29108577）から読み取れた、Etsy に公開済みの出品は次の 6 件:

| Etsy 出品 ID | 商品名（Printify 上） | 閲覧 | お気に入り | 価格 | 状態 |
|---|---|---|---|---|---|
| 4585522299 | Kanji Cannabis Love T-Shirt \| Taima Ai Japanese Calligraphy Tee \| 420 Hanko Back Print, Stoner Gift, Weed Streetwear, Black or White | – | – | – | – |
| 4585491734 | Kanji Black Mug \| Taima Ai Cannabis Love Japanese Calligraphy Coffee Cup \| 420 Stoner Gift, Weed Lover Mug, 11oz | – | – | – | – |
| 4585451765 | Rose Bouquet Tote Bag \| Colorful Roses & Vinyl Record Player Art \| Cotton Canvas Market Bag, Music Lover Gift | – | – | – | – |
| 4584786176 | Japan Weed Love Shop T-Shirt \| 420 Cannabis Leaf, Grinder & Bong Graphic Tee \| Stoner Gift, Japan Streetwear | – | – | – | – |
| 4584546414 | 420 Leaf Mug, Ink Splatter Cannabis Leaf Coffee Cup, Hand Lettered Ceramic Mug, Stoner Gift, Red and Black Leaf Art, 11oz | – | – | – | – |
| 4583938426 | 420 Stoner Cats T-Shirt \| Cannabis Leaf Back Print, Japan Flag Sleeve \| Funny Cat Lover Gift \| Marijuana Graphic Tee \| Japanese Streetwear | – | – | – | – |

## etsy_stats_log.csv について

スクリプトが Etsy の取得で止まったため、記録ファイルは作成されていない（空のファイルや作り物のデータは作らなかった）。
