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
