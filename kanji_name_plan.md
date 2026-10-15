# 名前入れ漢字の商品 計画（2026-10-15 案）

見本: 作成後ファイル/kanji_name/kanji_name_preview.jpg（Emma 恵満 / Liam 理愛夢 / Mia 美愛、黒インクと白インク）
作り方: tools/make_kanji_name.py（筆文字 Yuji Syuku、判子のカタカナ Yuji Boku、英字 Cinzel、意味 Cormorant。どれも商用OKの無料フォント）

## デザイン
- 縦書きの筆の漢字（名前の音に、良い意味の漢字を当てる）
- 横に赤い判子（中に名前のカタカナ）＝お店の 420 判子と同じ雰囲気
- 下に英語の名前と、漢字の意味（例: Blessing · Abundance）

## 商品（最初は2つ）
| 商品 | 案の価格 | 備考 |
|---|---|---|
| Tシャツ（白・黒） | $29.99 | 名前入りは普通のTシャツより高くても売れる |
| マグ（白） | $16.99 | 贈り物として人気 |
※ 価格・利益は公開前に計算してユーザーに確認する

## Etsy の設定
- 出品に「Personalization（名前入れ）」欄を付ける。案内文の例:
  "Enter the name you want in Japanese kanji (English letters, max 10 letters). We choose kanji with beautiful meanings and send you a preview before printing."
- 「オーダーの相談を受け付ける」をオンにする

## 注文が入ったときの流れ（大事）
1. 注文の見張り（1日2回）が通知する
2. 名前の漢字を決め、デザインを作る（このクラウドの Claude が tools/make_kanji_name.py で作れる）
3. Etsy のメッセージで購入者にプレビューを送り、OK をもらう
4. Printify でその注文のデザインを名前入りに差し替えてから、制作に回す

## 注意（公開前に決めること）
- 今の Printify は「注文を自動で承認」→ そのままだと、名前の入っていない見本のデザインで印刷されてしまう
  → 名前入りの商品を出す前に、承認を「手動」に変える必要がある（他の商品も手動になるので、注文ごとに承認ボタンを押す）
- 注文から発送までの日数を、名前入りの商品だけ +2日 くらい長くする
