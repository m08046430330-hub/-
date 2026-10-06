# Etsy API 接続テスト結果（4回目）

- 実行日時: 2026-10-06 01:44 UTC（日本時間 2026-10-06 10:44）
- 実行環境: クラウドのセッション（認証ヘッダーは環境のプロキシが自動で付与）
- 前提: 3回目（01:38 UTC）までの 403「Invalid API key: should be in the format 'keystring:shared_secret'」を受けて、店主が環境の Etsy 認証情報（`openapi.etsy.com` 宛て、ヘッダー `x-api-key`、値は Keystring と Shared Secret を半角 `:` でつないだ1行）を作り直した後の再テスト
- 方針: 読み取り（GET）のみ。Etsy・Printify のデータは一切変更していない
- 結論: **Etsy API の接続に成功（全手順 HTTP 200）。** 認証情報の作り直しで 403 は解消した

## 各手順の結果

| # | 手順 | 結果 |
|---|------|------|
| 1 | `GET /v3/application/openapi-ping` | ✅ HTTP 200（`{"application_id":1519069488830}`） |
| 2 | `GET /v3/application/shops?shop_name=420WEEDIOVESHOP` | ✅ HTTP 200（1件ヒット） |
| 3 | `GET /v3/application/shops/68269935/listings/active?limit=100` | ✅ HTTP 200（公開中 6件） |
| 4 | `python3 tools/etsy_stats.py --log etsy_stats_log.csv` | ✅ 正常終了（exit 0）。6件を表示し `etsy_stats_log.csv` を新規作成 |
| 5 | 本ファイルの更新 | ✅ |

エラーは無し。tools/etsy_stats.py は修正していない。

## ショップ情報

| 項目 | 値 |
|---|---|
| shop_id | 68269935 |
| shop_name | 420WEEDIOVESHOP |
| title | Japanese Calligraphy and 420 Art Tees, Mugs and Totes |
| is_vacation | false（休止していない） |
| listing_active_count | 6 |
| num_favorers | 0 |
| transaction_sold_count | 0 |
| review_count | 0 |
| currency_code | USD |
| 発送元 / ショップ所在地 | JP / JP |
| Etsy ペイメント登録 | 済み（is_etsy_payments_onboarded: true） |
| url | https://www.etsy.com/shop/420WEEDIOVESHOP |

announcement（お知らせ）:

> Welcome to 420 Weed Love Shop! Original designs that mix Japanese calligraphy and hanko seals with laid-back 420 culture, printed on tees, mugs and totes. Every item is made to order just for you. New designs are added regularly, so favorite the shop to see them first.
> Please note: we sell original art on apparel and homeware only. No smoking accessories or cannabis products are sold here.

参考: ショップポリシー（policy_*）はすべて未設定（null）、`is_using_structured_policies: false`。

## 出品ごとの情報（公開中 6件）

| Etsy 出品 ID | 商品 | 状態 | 閲覧数 | お気に入り | 価格（最安） | 在庫数 |
|---|---|---|---|---|---|---|
| 4585522299 | Kanji Cannabis Love T-Shirt（漢字Tシャツ 白・黒） | active | 0 | 0 | $23.99 | 11988 |
| 4585491734 | Kanji Black Mug（漢字 黒マグ） | active | 0 | 0 | $11.99 | 5 |
| 4585451765 | Rose Bouquet Tote Bag（ローズブーケ トート） | active | 0 | 0 | $21.99 | 20 |
| 4584786176 | Japan Weed Love Shop T-Shirt | active | 0 | 0 | $24.99 | 30 |
| 4584546414 | 420 Leaf Mug（420 リーフマグ 白） | active | 0 | 0 | $9.99 | 5 |
| 4583938426 | 420 Stoner Cats T-Shirt | active | 0 | 0 | $37.99 | 60 |

- 価格はバリエーションのうち最安値（API の `price`）。サイズ別価格は PROGRESS.md の商品一覧を参照
- 6件とも PROGRESS.md の商品一覧・Printify 側の出品 ID と一致
- 閲覧数・お気に入りはまだ全件 0。今後は `python3 tools/etsy_stats.py --log etsy_stats_log.csv` を定期的に実行すると、前回との差が表示される

## 過去の失敗（1〜3回目）のまとめ

1〜3回目はすべて HTTP 403 `{"error":"Invalid API key: should be in the format 'keystring:shared_secret'."}`。
環境に保存された値の形式が誤っていたことが原因で、認証情報を作り直したことで解消した。
