# Etsy ショップポリシー確認結果

- 実行日時: 2026-10-06 11:01 JST（2026-10-06T02:01Z）
- 対象: ショップ 420WEEDIOVESHOP（shop_id 68269935）
- 方法: Etsy API v3 の GET のみ（Etsy・Printify のデータは変更していない）

## 結論
- **返品・交換ポリシーは設定されている。** 返品: 受け付けない／交換: 受け付けない（shop_policies.md の選び方どおり）。
- **公開中の6商品すべてにこのポリシーが付いている**（return_policy_id 1519536307261）。
- **補足の英文が入っているかは API では確認できない。** 返品ポリシーの API には補足文の項目がなく、
  ショップ側の旧ポリシー欄（policy_refunds など）もすべて空。補足文は Etsy の画面（ショップ表示や商品ページの
  「返品・交換」欄）で目視確認が必要。

## 手順ごとの結果

### 1. GET /v3/application/shops/68269935 → 成功（200）
| 項目 | 値 |
|---|---|
| title | Japanese Calligraphy and 420 Art Tees, Mugs and Totes |
| announcement | 設定あり（"Welcome to 420 Weed Love Shop! ..." と「喫煙具・大麻製品は売っていない」旨の2段落） |
| is_using_structured_policies | false |
| has_onboarded_structured_policies | false |
| has_unstructured_policies | false |
| policy_welcome / policy_payment / policy_shipping / policy_refunds / policy_additional / policy_seller_info / policy_privacy | すべて null（空） |
| policy_update_date | 0（一度も更新されていない） |
| policy_has_private_receipt_info | false |
| is_opted_in_to_buyer_promise | false |
| include_dispute_form_link | false |
| is_etsy_payments_onboarded | true |
| is_vacation | false |
| listing_active_count | 6 |
| languages | ["ja"] |

メモ: policy_ 系はすべて旧形式（文章で書くポリシー）の欄。現在の Etsy では返品・交換は手順2の「返品ポリシー」で管理されるため、
ここが空でも返品・交換の設定とは矛盾しない。is_using_structured_policies が false なので、
発送・支払いなどの「構造化ポリシー」は API 上はまだ有効になっていない扱い。

### 2. GET /v3/application/shops/68269935/policies/return → 成功（200、OAuth 不要だった）
```json
{"count":1,"results":[{"return_policy_id":1519536307261,"shop_id":68269935,"accepts_returns":false,"accepts_exchanges":false,"return_deadline":null}]}
```
- accepts_returns: false（返品不可）
- accepts_exchanges: false（交換不可）
- return_deadline: null（返品・交換を受けないので期限なし）

### 3. GET /v3/application/shops/68269935/listings/active?limit=100 → 成功（200、6件）
| Etsy ID | 商品 | return_policy_id | shipping_profile_id | 製作日数 | views | num_favorers |
|---|---|---|---|---|---|---|
| 4585522299 | Kanji Cannabis Love T-Shirt | 1519536307261 | 316212479711 | 3–5 | 0 | 0 |
| 4585491734 | Kanji Black Mug | 1519536307261 | 316855216676 | 2–5 | 0 | 0 |
| 4585451765 | Rose Bouquet Tote Bag | 1519536307261 | 316374004275 | 2–5 | 0 | 0 |
| 4584786176 | Japan Weed Love Shop T-Shirt | 1519536307261 | 316212479711 | 3–5 | 0 | 0 |
| 4584546414 | 420 Leaf Mug | 1519536307261 | 316855216676 | 2–5 | 0 | 0 |
| 4583938426 | 420 Stoner Cats T-Shirt | 1519536307261 | 316212479711 | 3–5 | 0 | 0 |

- 全商品が同じ返品ポリシー（手順2のもの）を使っている。
- 発送プロフィールは3種類（Tシャツ3点で共通、マグ2点で共通、トート1点）。
- views・お気に入りは全商品 0（API の views は集計に遅れが出ることがある）。

## shop_policies.md との比較
| shop_policies.md の内容 | API での状態 |
|---|---|
| 返品: 受け付けない | 入っている（accepts_returns=false） |
| 交換: 受け付けない | 入っている（accepts_exchanges=false） |
| 返品・交換の補足英文（不良品・破損・間違いは30日以内に連絡で無料交換または返金） | API では確認不可（補足文の項目が API に無い）。画面で目視確認が必要 |
| キャンセル（購入後1時間以内に連絡） | API 上は見当たらない（policy_ 欄は空）。画面の設定またはFAQに入れたか要確認 |
| 発送（2–5営業日、追跡番号、住所誤り、関税は購入者負担） | policy_shipping は空。製作日数は各商品に 2–5／3–5 日で設定済み |
| よくある質問（FAQ 4問） | FAQ は API に項目が無く確認不可。画面で要確認 |
| 「喫煙具・大麻製品は売っていない」旨 | announcement（お知らせ）に入っている |

## エラー
- なし（3つの GET はすべて 200）。
