# 直しの依頼（点検係より・2026-11-03）— ユーザーが「修正して」と指示済み

点検係は読み取りのみ。作成係が Etsy 鍵（OAuth、api.etsy.com）で書き込む。値はすべて **fix_data_20261103.json** に用意済み。
書いたあとは点検係が読み直して確認する。

| # | 直すこと | JSON の場所 | 書き込み先（Etsy API） |
|---|---|---|---|
| 1 | 写真の説明文 8件・95枚 | 1_alt_texts | 画像ごとに POST /shops/68269935/listings/{id}/images（listing_image_id + alt_text）。最初に1枚試して読み直す |
| 2 | Alien パーカー（4606893312）の棚を Hoodies & Long Sleeves へ | 2_section | PATCH /shops/68269935/listings/4606893312（shop_section_id=60979751） |
| 3 | Alien マグ（4606871403）・Alien T（4606893232）の属性 | 3_properties | PUT /shops/68269935/listings/{id}/properties/{property_id}（value_ids・values）※ tools/etsy_oauth_colors.py の put_property と同じ形 |
| 4 | ポリシー文2か所 | 4_policy | PUT /shops/68269935（policy_additional・policy_refunds）。ダメなら Etsy 画面 Settings → Policies |

属性の値は、同じ種類の商品（Stoner Cats マグ・Stoner Cats T）にすでに入っている値をそのまま写したもの。

## 作成係の対応（2026-11-03）
- 1 ✅ 写真の説明文 8件・95枚（rank も一緒に送り、全件で枚数・順番・文を読み直して確認）
- 2 ✅ Alien パーカーの棚 → Hoodies & Long Sleeves（60979751）
- 3 ✅ Alien マグ 6項目・Alien T 5項目の属性
- 4 ❌ API は「Shop policy is not eligible for EU Terms」（400）で書き込めない → Etsy 画面 Settings → Policies で入力が必要
  - 追加ポリシー（Additional policies）: 1行目の「オーダーメイド」とその改行だけ消す
  - 返品の文（Refunds）: fix_data_20261103.json の 4_policy.policy_refunds の英文に差し替え
  - ⚠ 新しい返品の文は「14日以内に連絡」、追加ポリシーの英文は「30 days of delivery」で日数が合っていない。どちらかにそろえるとよい

## 点検係の確認（2026-11-03）
- 1 ✅ 8件・95枚とも、用意した文と完全に一致
- 2 ✅ Alien パーカー → Hoodies & Long Sleeves
- 3 ✅ Alien マグ 6項目・Alien T 5項目とも予定どおり
- 4 ❌ まだ（API 不可のため Etsy 画面で入力が必要）
  - 日数のずれを直すため、返品の文を「30 days of delivery」に合わせた（fix_data_20261103.json の 4_policy を更新済み）
