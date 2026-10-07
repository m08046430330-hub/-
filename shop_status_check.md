# Etsy ショップ状態チェック（2026-10-07 実施・確認のみ／変更なし）

## ショップ概要（shop 68269935 / 420WEEDIOVESHOP）

| 項目 | 値 |
|---|---|
| 休暇モード (is_vacation) | false（営業中） |
| 公開中の出品数 | 8 |
| 累計販売数 | 0 |
| ショップのお気に入り | 0 |
| レビュー数 | 0 |

## 出品一覧

最終更新は UTC。画像数は `listings/active?includes=Images` で画像が返らなかったため、`GET /listings/{id}/images` で個別に取得。

| listing_id | 商品名（先頭40字） | 価格 | 在庫 | 閲覧 | ♡ | タグ | 画像 | 素材 | スタイル | 自動更新 | 重量 | 最終更新 | 属性数 | 属性名 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4583938426 | 420 Stoner Cats T-Shirt \| Cannabis Leaf | $37.99 | 60 | 20 | 0 | 13 | 20 | なし | なし | ON | 未設定 | 10-07 07:01 | 7 | Primary color, Material multi, Sleeve length, Neckline, Secondary color, Clothing style, Clothing graphic |
| 4584786176 | Japan Weed Love Shop T-Shirt \| 420 Canna | $24.99 | 30 | 4 | 0 | 13 | 12 | なし | なし | ON | 未設定 | 10-07 07:15 | 7 | Primary color, Material multi, Sleeve length, Secondary color, Clothing style, Neckline, Clothing graphic |
| 4585522299 | Kanji Cannabis Love T-Shirt \| Taima Ai J | $23.99 | 11988 | 2 | 0 | 13 | 20 | なし | なし | ON | 未設定 | 10-07 07:02 | **0** | — |
| 4585451765 | Rose Bouquet Tote Bag \| Colorful Roses & | $21.99 | 1998 | 3 | 0 | 13 | 14 | なし | なし | ON | 未設定 | 10-07 06:58 | 2 | Primary fabric type, Material multi |
| 4585491734 | Kanji Black Mug \| Taima Ai Cannabis Love | $11.99 | 999 | 2 | 0 | 13 | 8 | なし | なし | ON | 未設定 | 10-07 06:58 | **0** | — |
| 4584546414 | 420 Leaf Mug, Ink Splatter Cannabis Leaf | $9.99 | **5** | 2 | 0 | 13 | 13 | なし | なし | ON | 未設定 | 10-07 07:04 | 6 | Occasion, Height, Width, Depth, Material multi, Home graphic |
| 4589431758 | 420 Stoner Mouse Mug \| Funny Weed Cartoo | $9.99 | 999 | 2 | 0 | 13 | 7 | なし | なし | ON | 未設定 | 10-07 06:59 | 12 | Dishwasher safe, Microwave safe, Volume, Material multi, Insulated, Handle, Enamel, Occasion, Height, Width, Depth, Home graphic |
| 4589392223 | Stoner Cats Mug \| Funny 420 Cat Coffee C | $9.99 | 999 | 0 | 0 | 13 | 7 | なし | なし | ON | 未設定 | 10-07 07:00 | 12 | （同上 12 項目） |

`tools/etsy_stats.py --log etsy_stats_log.csv` も実行済み（閲覧数は上表と一致、結果を CSV に追記）。

## 気になる点

- **販売 0・お気に入り 0・レビュー 0**。閲覧は合計 35 で、そのうち 20 が Stoner Cats T-Shirt に集中。
- **属性（properties）が 0 件の出品が 2 つ**：Kanji Cannabis Love T-Shirt と Kanji Black Mug。検索フィルタ（色・素材など）に出てこないので、他の T シャツやマグに合わせて設定したい。
- **Tote Bag も属性が 2 件だけ**。色・用途などを足せる余地あり。
- **素材・スタイル・重量が全出品で未設定**。必須ではないが、素材（cotton / ceramic など）は検索に効く。
- **420 Leaf Mug の在庫が 5 だけ**（他のマグは 999）。売れるとすぐ売り切れになるので、Printify 同期の設定を確認したい。
- **在庫数がばらばら**（Kanji T-Shirt 11988、Tote 1998 など）。バリエーション数×在庫の合計なので問題ではないが、念のため。
- **Stoner Cats T-Shirt が $37.99** と他の T シャツ（$23.99〜$24.99）より高め。閲覧は一番多いのに♡がないので、価格を見て離脱している可能性あり。
- 全出品の最終更新が 2026-10-07 06:58〜07:15 UTC に集中（Printify からの一括同期とみられる）。
- 自動更新は全出品 ON。タグは全出品で上限の 13 を使用。
