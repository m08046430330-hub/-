# 商品ページ改善案（2026-10-05 作成・未反映）

ショップ再開後、ユーザーの確認を取ってから反映する。反映は Printify の商品を更新 → Etsy に公開。
タグは Etsy の制限（1つ20文字以内・13個まで）に合わせてある。

## 全体の方針
- **パイプ類の言葉を外す**：Etsy は喫煙具（bong・grinder など）の販売を禁止している。Tシャツの絵柄でも、タイトルやタグに入っていると
  喫煙具の出品と誤解されて、表示が制限されるおそれがある。
- **クリスマス向けのタグを足す**：Etsy のメールでもクリスマス商戦が始まっている。`christmas 420 gift`、マグには `stocking stuffer`。
- **効果の薄いタグを入れ替える**：`gift for him` などの広すぎる言葉や、商品と合わない言葉（白もあるのに `black kanji shirt` など）。
- **タイトルは商品名を先頭に**：検索結果では先頭しか見えないので、何の商品かを最初に書く。長すぎるタイトル（138文字）は短くする。
- **説明文の最初に「セット買い」の一文**：漢字Tシャツ ↔ 漢字マグ、Stoner Cats Tシャツ ↔ Stoner Cats マグ。

## 1. 漢字 Cannabis Love Tシャツ（Printify 6abcac96201f7338ea0cb72f / Etsy 4585522299）
- 新タイトル: `Kanji Cannabis Love T-Shirt, Japanese Calligraphy 420 Tee with Red Hanko Seal, Stoner Gift, Black or White`
- 新タグ: `kanji t shirt`, `japanese calligraphy`, `kanji streetwear`, `420 shirt`, `cannabis love`, `hanko seal shirt`, `japanese gift`,
  `stoner gift`, `weed lover gift`, `japanese tee`, `unisex graphic tee`, `gift for stoner`, `christmas 420 gift`
- 外すタグ: `black kanji shirt`（白もある）、`gift for him`、`gift for her`、`black graphic tee`
- 説明文の追加（先頭）: `Pair it with our matching Kanji Black Mug for a complete gift set.`

## 2. 漢字 黒マグ（Printify 6abc910b31ee521b8804f585 / Etsy 4585491734）
- 新タイトル: `Kanji Black Mug, Japanese Calligraphy Cannabis Love Coffee Cup, 420 Stoner Gift, 11oz Ceramic`
- 新タグ: `kanji mug`, `black coffee mug`, `japanese mug`, `japanese calligraphy`, `420 mug`, `cannabis mug`, `stoner gift`,
  `weed lover gift`, `hanko seal`, `japanese gift`, `stocking stuffer`, `christmas 420 gift`, `11oz black mug`
- 外すタグ: `smoker present`（喫煙の連想）、`dark aesthetic`、`tea coffee mug`、`stoner coffee`、`cannabis lover`、`japanese style`
- 説明文の追加（先頭）: `Pair it with our matching Kanji Cannabis Love T-Shirt for a complete gift set.`

## 3. ローズブーケ トート（Printify 6abc785d1e33a68782095a60 / Etsy 4585451765）
- 新タイトル: `Rose Bouquet Tote Bag, Vinyl Record Player Art, Colorful Floral Canvas Tote, Music Lover Gift for Her`
- 新タグ: `rose tote bag`, `floral tote bag`, `vinyl record gift`, `record player art`, `music lover gift`, `record collector`,
  `canvas tote bag`, `market bag`, `book bag`, `gift for her`, `flower lover gift`, `420 tote bag`, `christmas gift her`
- 外すタグ: `stoner gift`（花とレコードの商品なので、買う人とずれる）、`shopping tote`、`colorful tote`、`vinyl record tote`、`record player bag`

## 4. Japan Weed Love Shop Tシャツ（Printify 6abb4b818cf393fa7b06f121 / Etsy 4584786176）
- 新タイトル: `Japan Weed Love T-Shirt, Hand Drawn 420 Cannabis Leaf Graphic Tee, Tokyo Streetwear, Stoner Gift`
  （`Grinder & Bong` を外す）
- 新タグ: `japan weed tee`, `420 t shirt`, `cannabis tee`, `weed t shirt`, `stoner gift`, `hand drawn tee`, `tokyo streetwear`,
  `japan streetwear`, `leaf graphic tee`, `420 clothing`, `unisex graphic tee`, `weed lover gift`, `christmas 420 gift`
- 外すタグ: `bong tee shirt`、`grinder t shirt`、`smoker gift tee`、`marijuana shirt`、`herb lover tee`、`casual streetwear`
- 説明文の変更: 絵柄の説明を `sketch-style 420 illustrations` にまとめ、最後に `Please note: this is a T-shirt only. No smoking accessories are included.` を足す

## 5. 420 リーフマグ（Printify 6aba111c9c7ec344c80c3fed / Etsy 4584546414）
- 新タイトル: `420 Leaf Mug, Red and Black Ink Splatter Cannabis Leaf Coffee Cup, Hand Lettered 420, Stoner Gift, 11oz`
- 新タグ: `420 mug`, `cannabis leaf mug`, `weed mug`, `pot leaf mug`, `stoner mug`, `ink splatter mug`, `hand lettered mug`,
  `red and black mug`, `stoner gift`, `weed lover gift`, `cannabis gift`, `stocking stuffer`, `christmas 420 gift`
- 外すタグ: `ceramic mug`・`coffee mug`（広すぎて埋もれる）、`funny coffee`（絵柄と合わない）、`smoker gift`、`herb lover`、`gifts for him`、`gifts for her`、`marijuana mug`
- 別作業: 表紙画像が front のまま → Printify の画面で見栄えのいい画像に変える（API では変えられない）

## 6. 420 Stoner Cats Tシャツ（Printify 6ab98fd4d1cf99cb66083aae / Etsy 4583938426）
- 新タイトル: `Stoner Cats T-Shirt, Funny Rasta Cat 420 Tee, Cannabis Leaf Back Print, Japan Flag Sleeve, Cat Lover Gift`
  （138文字 → 105文字。いちばん目立つ「猫」を先頭に）
- 新タグ: `stoner cat shirt`, `funny cat shirt`, `rasta cat tee`, `cat lover gift`, `cat mom gift`, `420 cat shirt`, `420 graphic tee`,
  `cannabis leaf tee`, `stoner gift`, `weed lover gift`, `japan streetwear`, `japanese flag tee`, `christmas 420 gift`
- 外すタグ: `japan 420 tee`・`japanese 420 shirt`・`tokyo 420 tee`・`420 japan gift`・`tokyo streetwear`（日本系が多すぎて、猫好きの検索を取りこぼしている）、`marijuana shirt`
- 説明文の追加（先頭）: `Pair it with our matching Stoner Cats Mug.`（マグ公開後）

## 7. Stoner Cats マグ（新・未公開 / Printify 6abdfbff0a218a2b880b9cc8）
- タイトルはそのままでよい
- タグの入れ替え: `marijuana mug` → `stocking stuffer`、`11oz ceramic mug` → `christmas 420 gift`
