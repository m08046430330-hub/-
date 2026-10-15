# 名前入れ漢字の商品 計画（2026-10-15）

見本: 作成後ファイル/kanji_name/kanji_name_preview.jpg（Emma 恵満 / Liam 理愛夢 / Mia 美愛、黒インクと白インク）
作り方: `python3 tools/kanji_name/make.py 出力先 漢字 カタカナ 英語名 "意味"`
（筆文字 Yuji Boku＋かすれ・にじみ・墨の飛び散り加工〔tools/kanji_name/brush.py〕、判子のカタカナも Yuji Boku、英字 Cinzel、意味 Cormorant。どれも商用OKの無料フォント。
Yuji Boku は名前ごとに Google Fonts から必要な文字だけ自動で取り寄せる）
出力: デザイン単体（黒字・白字）、Tシャツ前面 4500x5400（黒字・白字）、マグ 2475x1155（両面）
- 本物の行書フォント（例: 青柳衡山フォントT）は Google Fonts に無く、このクラウドからはダウンロードできない。
  ユーザーが PC でダウンロードして tools/kanji_name/ に入れれば、それを使える
- Higgsfield の AI 書道は無料プランだと解像度が低く、このクラウドから画像を取り込めないため不採用

## デザイン
- 縦書きの筆の漢字（名前の音に、良い意味の漢字を当てる）
- 横に赤い判子（中に名前のカタカナ）＝お店の 420 判子と同じ雰囲気
- 下に英語の名前と、漢字の意味（例: Blessing · Abundance）

## 商品（最初は2つ）
| 商品 | 案の価格 | 備考 |
|---|---|---|
| 商品 | Printify ID | 価格 | 原価 | 利益(円) |
|---|---|---|---|---|
| Custom Kanji Name T-Shirt（白=黒字・黒=白字、S〜3XL、前面のみ＋首の420ラベル） | 6ad0367ba4977e30ad0b5b8a | $29.99 全サイズ | $12.03 / 2XL $14.55 / 3XL $16.85 | 2127 / 1749 / 1404 |
| Custom Kanji Name Mug 11oz（白、両面） | 6ad036804b954522360ef7ec | $16.99 | $5.03 | 1410 |
- 2026-10-15 下書きとして作成（未公開）。見本は EMMA 恵満。モックアップ: 作成後ファイル/kanji_name/printify_mockups_emma.jpg

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
