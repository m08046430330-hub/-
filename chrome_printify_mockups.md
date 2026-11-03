# Printify のモックアップ（写真）を増やす手順（Chrome の Claude 用・2026-11-03）

目的: 写真が少ない出品を、Japan Weed Love Shop Tシャツ（13枚）と同じくらいにする。
**ユーザーの同意あり（2026-11-03）。ただし「公開（Publish）」は押さないこと。** Etsy への送信はクラウドのセッションが「写真だけ」で行う。

## やること（1商品ごと）
1. Printify → My Products（ストア「My Etsy Store」）で商品名を開く。直接開く場合: `https://printify.com/app/editor/<Printify ID>`
2. 「Mockups」（モックアップ）の選択画面を開き、下の「選ぶ写真」を目安に追加でチェックを入れる。
   - 今チェックが入っているものは外さない。**1枚目（表紙）は変えない**
   - 合計は 13〜16枚くらいにする（Etsy は20枚まで。クラウド側で絵のアップを2〜3枚足すため）
3. 保存（Save / Save changes）。**「Publish」「Publish changes」は押さない**
4. 終わったら、商品ごとに「選んだ枚数」をメモしてユーザーに伝える

## 選ぶ写真の目安
- Tシャツ・長袖・パーカー: 平置きの表／背中、たたんだ姿、ハンガー、首のアップ、モデル（表・背中、男女）、部屋で着た写真、2人の写真、サイズ表（Size chart）
- マグ: 正面・反対側・取っ手側、手に持った写真、机の上（コーヒー・朝食などの場面）、サイズの比較、箱
- ステッカー: 色々な貼った場面（ノートPC・水筒・スマホ・ノート）、サイズの比較

## 対象（写真が少ない順）
| 出品 | Printify ID | 今（Etsy / Printify） | 目標 |
|---|---|---|---|
| 420 Alien Mug | 6ae5bae1e44fe8bde907b3c6 | 5 / 1 | Printify で 8〜10 |
| 420 Alien Hoodie | 6ae5bae0aa7972528106c375 | 5 / 3 | Printify で 11〜13 |
| 420 Alien T-Shirt | 6ae5ba6777623d452b08f11f | 6 / 4 | Printify で 11〜13 |
| 420 Stoner Mouse Mug | 6ac465b72998c445770d505c | 7 / 7 | 10〜12 |
| Stoner Cats Mug | 6ac457c0514db657c9055626 | 7 / 8 | 10〜12 |
| Japanese Bonsai Vinyl Mug | 6aced8048a0ce3aa0906893e | 8 / 8 | 10〜12 |
| Kanji Black Mug | 6abc910b31ee521b8804f585 | 8 / 8 | 10〜12 |
| Japanese Bonsai Vinyl T-Shirt | 6acec9f7357b3775a4016049 | 9 / 9 | 13〜16 |
| 420 Stoner Mouse Long Sleeve | 6ac467a12998c445770d515d | 9 / 9 | 13〜16 |
| 盆栽 / Stoner Mouse / Stoner Cats ステッカー | 6ad458369c8f61e78707c0ea / 6ad4576bf1aeec4b590f9c55 / 6ad4562bf1aeec4b590f9b56 | 各 9 / 9 | 各 12 |

Stoner Cats Hoodie（6ad1bb482a7b57e9090d44b5）は Etsy に13枚あるが Printify は6枚。Etsy 側の7枚は手で足したものなので、この商品は触らない。

## そのあと（クラウドのセッションがやる）
- POST /publish.json を images:true だけ（タイトル・説明・タグ・値段・配送は送らない）で送る
- Etsy 側で消えた、手で足した写真（Alien の絵のアップ、Alien マグの全体図・取っ手側など）を入れ直す
- 写真の説明文（代替テキスト）を全部入れ直す
- tools/shop_audit.py で配送設定・値段・文章が変わっていないか確認（変わっていたら API で戻す）
