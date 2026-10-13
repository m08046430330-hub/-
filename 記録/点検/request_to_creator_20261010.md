# 作成係への依頼（点検係より・2026-10-10 更新）

元の点検結果: check_full_20261010.md / check_longsleeve.md / check_more_20261009.md
★ = ユーザーの同意が必要（公開・再公開・価格・削除など）。終わったら PROGRESS.md を更新して push。

## 1. 最優先: Printify を Etsy に合わせる（上書き事故の防止）
Etsy 画面でタグ・説明文を直したため、Printify には古い内容が残っている。
このまま Printify から再公開（title/description/tags を送る）すると Etsy の改善が消える。
→ Printify 側のタグ・説明文を Etsy の今の内容と同じに更新する（**更新だけ。再公開はしない**）。

| 商品 | Etsy ID | Printify ID | Etsy にだけあるタグ（Printify に入れる） | Printify にだけあるタグ（消す） |
|---|---|---|---|---|
| Stoner Cats Tシャツ | 4583938426 | 6ab98fd4d1cf99cb66083aae | christmas 420 tee, halloween weed shirt | marijuana shirt, stoner gift |
| 420 リーフマグ | 4584546414 | 6aba111c9c7ec344c80c3fed | christmas weed mug, stoner xmas gift | gifts for him, stoner gift |
| Japan Weed Tシャツ | 4584786176 | 6abb4b818cf393fa7b06f121 | christmas weed tee, halloween 420 shirt | stoner gift tee, unisex tee |
| ローズブーケ トート | 4585451765 | 6abc785d1e33a68782095a60 | christmas tote bag, holiday gift for her | 420 tote bag, stoner gift |
| 漢字 黒マグ | 4585491734 | 6abc910b31ee521b8804f585 | christmas kanji mug, halloween black mug | smoker present, weed lover gift |
| 漢字Tシャツ | 4585522299 | 6abcac96201f7338ea0cb72f | halloween kanji tee, kanji christmas gift | stoner gift, weed lover gift |
| Stoner Cats マグ | 4589392223 | 6ac457c0514db657c9055626 | cat christmas gift, halloween cat mug | stoner gift, weed lover gift |
| Stoner Mouse マグ | 4589431758 | 6ac465b72998c445770d505c | christmas stoner mug, stocking stuffer 420 | stoner gift, weed lover gift |

説明文: 上の8件とも Etsy の説明文（「Shipping & delivery」入り）を GET して Printify の description に入れる。
注意: PUT で画像が1枚に減ることがあるので、更新後に Printify の写真選択が残っているか確認。

## 2. Etsy 画面で入力すること（PC の Chrome の Claude で）
2-1. 主色・副色（7出品）
| 商品 | Etsy ID | 主色 | 副色 |
|---|---|---|---|
| 漢字Tシャツ | 4585522299 | White | Black |
| 漢字 黒マグ | 4585491734 | Black | White |
| Stoner Mouse マグ | 4589431758 | White | 柄の主な色（茶色系なら Brown） |
| Stoner Mouse 長袖 | 4592364716 | White | 柄の主な色 |
| Stoner Cats マグ | 4589392223 | White | 柄の主な色 |
| 420 リーフマグ | 4584546414 | White | Red |
| ローズブーケ トート | 4585451765 | Beige | 柄の主な色 |

2-2. ショップのポリシー
- 追加ポリシーの頭の日本語「オーダーメイド」を消す
- 返金ポリシーの全部大文字の文を差し替え（例）:
  "Because every item is made to order just for you, I can't accept returns or exchanges. If your item arrives damaged or wrong, please message me and I'll make it right."

2-3. 購入後のお礼メッセージ（sale_message、例）:
  "Thank you for your order! Your item is made just for you and usually ships within 5 business days. If you have any questions, feel free to message me anytime."

2-4. Stoner Cats マグ（4589392223）の配送設定を、他のマグと同じ 316855216676 に変更

## 3. ★ ユーザーの同意後に行うこと
- 420 リーフマグ（Printify 6aba111c9c7ec344c80c3fed）の Etsy 在庫が 5 → variants だけ送って 999 に戻す
  （このとき title/description/tags は送らない）

## 4. 長袖Tシャツ（Etsy 4592364716 / Printify 6ac467a12998c445770d515d）
- 説明文の最後に他と同じ「Shipping & delivery」の2行を追加
- タグ2個を季節の言葉に入れ替え（例: "christmas stoner shirt", "halloween weed tee"）
- Etsy と Printify の両方を同じ内容に

## 5. 余裕があれば
- 長袖以外の8出品の写真の説明文（最初の3枚だけでも）
- Stoner Mouse の柄で半袖Tシャツ・トートの案（★公開はユーザーの同意後）
- Pinterest 用の縦長の宣伝画像
