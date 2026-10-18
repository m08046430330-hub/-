# 直しの依頼（点検係より・2026-10-18）

点検係は読み取りのみ。以下は作成係が書き込む（OAuth 書き込みは tools/etsy_oauth_colors.py と同じ鍵で api.etsy.com へ）。
書いたあとは点検係が読み直して確認する。

## 1. ショップのポリシー文（API で直せる: updateShop）
- policy_additional: 1行目の「オーダーメイド」と改行を消す（2行目以降の英文はそのまま）
- policy_refunds を次の文に差し替え:
  "Because every item is made to order just for you, I can't accept returns or exchanges for change of mind or wrong size. If your item arrives damaged or with a printing error, please message me within 14 days with a photo and I'll send a replacement or refund."
  ※ Etsy 側の新しい返品ポリシー画面（return_policy_id 1519536307261: 返品・交換不可）とも内容が合っている

## 2. 写真の説明文（代替テキスト）14出品・170枚 → ✅ 2026-10-18 作成係が入力・確認済み
- 文は etsy_alt_texts.json に用意済み（出品ID → 画像ID → alt_text）
- 書き込み方: 画像ごとに POST /v3/application/shops/68269935/listings/{listing_id}/images に
  listing_image_id と alt_text を送る（画像は増えない・順番も変わらない。最初に1件だけ試して読み直すこと）
- 長袖Tシャツ（4592364716）は入力済みなので対象外

## 3. 配送設定（読み取りで中身を確認した結果）
| 配送設定 | 使っている出品 | 送れる国 |
|---|---|---|
| 316212479711 Tシャツ用 | Tシャツ5・長袖1 | US・CA・EU 各国・UK・AU・NZ・その他の国（$10.39） ✅ |
| 316855216676 マグ用 | マグ4 | US・CA・その他の国（$19.99） ✅ |
| 316810712213 マグ用（別） | 盆栽マグ・名入れマグ | 上と同じ内容 ✅ |
| **318142368400 パーカー用** | パーカー | **US・CA・AU だけ** ⚠ |
| **316374004275 トート用** | ローズトート・盆栽トート | **US・CA・AU だけ** ⚠ |

- パーカーの設定が別なのは、Printify が商品の種類ごとに作るため。別であること自体は問題ない
- 問題は**送れる国が少ない**こと。UK・ヨーロッパ・日本などのお客さんはパーカーとトートを買えない
- 作成係: Printify でパーカー（6ad1bb482a7b57e9090d44b5）とトート2件の工場が EU・UK・その他の国へ送れるか確認。
  送れるなら Printify の送料表どおりに Etsy の配送設定へ国を追加（★送料を決めるのでユーザーの同意後）。
  送れないなら今のまま（説明文に「US・カナダ・オーストラリアのみ発送」と書くと親切）

## 4. ついでに（前回からの残り）
- Printify 12件のタイトルを Etsy の短いタイトルに合わせる（再公開はしない）
- 名入れ2件の入力説明・文字数上限を Etsy 画面で確認
