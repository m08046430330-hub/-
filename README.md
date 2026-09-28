# T-SHIRT STORE（Tシャツ オンライン販売サイト）

オリジナルTシャツを販売するためのシンプルなオンラインショップです。
HTML / CSS / JavaScript のみで動作し、ビルド不要です。

## 機能

- 商品一覧（カテゴリ絞り込み：ベーシック / グラフィック / 限定）
- 商品詳細（サイズ・数量の選択）
- カート（ブラウザに保存、数量変更・削除）
- 送料計算（全国一律550円、5,000円以上で無料）、代引き手数料
- 注文情報入力フォーム
- スマートフォン対応

## 使い方

`index.html` をブラウザで開くだけで動作します。

ローカルサーバーで確認する場合：

```sh
python3 -m http.server 8000
# http://localhost:8000 を開く
```

## 商品の追加・編集

`js/products.js` の `PRODUCTS` 配列を編集してください。

```js
{
  id: "basic-white",          // 一意のID
  name: "ベーシックTシャツ ホワイト",
  category: "basic",          // basic / graphic / limited
  price: 3300,                // 税込価格
  color: "#f5f5f5",           // 本体カラー
  print: "",                  // プリント柄（"", "LOGO", "SUN", "OPEN"）
  sizes: ["S", "M", "L", "XL"],
  description: "商品説明"
}
```

送料などの設定は `js/app.js` 冒頭の定数で変更できます。

## 公開方法

GitHub Pages を使うと無料で公開できます：
リポジトリの Settings → Pages → Branch を選択して保存。

## 本番運用の前に

現在の注文フォームは画面上で注文完了を表示するのみで、実際の決済・注文受付は行いません。
実際に販売を開始するには、以下のいずれかと連携してください。

- **Stripe Payment Links / Checkout**：クレジットカード決済
- **フォームサービス**（Formspree、Googleフォーム等）：注文内容をメールで受け取る
- **BASE / STORES / Shopify**：決済・在庫管理まで含めたECサービスへの移行

また、日本国内で販売する場合は「特定商取引法に基づく表記」と「プライバシーポリシー」のページを用意してください。

## Printify の価格を自動設定する（tools/printify_price.py）

Printify の全商品について、1個あたりの利益が目標額（既定 500円）になる価格を
原価から計算し、一括で設定するスクリプトです。

```sh
# APIトークンは Printify の My Profile → Connections → API tokens で作成
export PRINTIFY_TOKEN="（トークン）"      # Windows PowerShell: $env:PRINTIFY_TOKEN="（トークン）"

python tools/printify_price.py                        # 確認のみ（何も変更しない）
python tools/printify_price.py --apply                # Printify の価格を更新
python tools/printify_price.py --apply --publish      # さらに Etsy に反映
python tools/printify_price.py --profit-yen 700 --rate 145   # 目標利益・為替を変更
```

Etsy の手数料は「販売価格の9.5% + 1.15ドル」の概算で計算しています（Printify 画面の表示から逆算）。
価格は「○○.99ドル」に切り上げます。
