# 点検: 漢字の2商品（2026-10-08）

読み取り（GET）のみ。Etsy API と Printify API で確認。在庫の詳細（inventory）は Etsy の OAuth が無いため見られない。

## 漢字 Cannabis Love Tシャツ（Etsy 4585522299 / Printify 6abcac96201f7338ea0cb72f）
- 公開中。閲覧2・♥0。タイトル132字、タグ13個、写真20枚（2048px）、説明1849字。Printify とタイトル・タグは一致
- 価格 $23.99（S〜XL）/ $26.99（2XL）/ $29.99（3XL）、白・黒 各6サイズ＝12種類。利益 約422/453/518円（記録どおり）
- Etsy の属性: 5件入った（素材 Cotton/Polyester、スタイル Streetwear、首 Crew、絵柄 Phrase & saying、袖 Half sleeve）
- 問題
  - ⚠ 袖の長さが「Half sleeve」→ 他のTシャツと同じ「Short sleeve」が正しい
  - ❌ 主色・副色が Etsy に無い（Printify 側には White/Black を入れてあるが届いていない。既知の問題）
  - ❌ 写真の説明文（代替テキスト）20枚とも空
  - ❌ materials 欄・重さ・配送サイズが空

## 漢字 黒マグ（Etsy 4585491734 / Printify 6abc910b31ee521b8804f585）
- 公開中。閲覧2・♥0。タイトル112字、タグ13個、写真8枚、説明961字。Printify とタイトル・タグは一致
- 11oz のみ $11.99、原価 $7.11、利益 約419円（記録どおり）。印刷は横長1枚（両面に同じ柄）で説明文と合っている
- Etsy の属性: 6件入った（行事 Birthday、高さ10・幅12・奥行9cm、素材 Ceramic、絵柄 Phrase & saying）
- 問題
  - ❌ 主色（Black）・副色（White）が Etsy に無い（既知の問題）
  - ❌ 食洗機・電子レンジ OK、容量 11oz などの属性が無い（Stoner マグには入っている）
  - ❌ 写真の説明文 8枚とも空、materials 欄・重さ・配送サイズが空

## 作成係に頼むこと（Etsy 画面での手入力。API からは届かないため）
1. Tシャツ: 袖の長さを Short sleeve に直す。主色 White・副色 Black を入れる
2. 黒マグ: 主色 Black・副色 White、Dishwasher safe=Yes、Microwave safe=Yes、Volume=11 fl oz、Handle=Yes を入れる
3. 両方: 写真の説明文（最初の数枚だけでもよい）と materials 欄
