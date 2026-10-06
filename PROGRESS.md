# 420WEEDIOVESHOP 作業記録（2026-10-05 更新）

次のセッションはこのファイルを最初に読むこと。

## ショップ・接続
- Etsy ショップ: 420WEEDIOVESHOP / Printify ショップ ID 29108577（My Etsy Store）
- Printify API: 環境の API 認証情報で自動付与。ヘッダー `User-Agent: printify-price-script` が必須（無いと 403）
- Etsy API: 承認済み（2026-09-30）。認証情報 `x-api-key: keystring:shared_secret` を環境に登録済み。
  新しいセッションで `python tools/etsy_stats.py` を実行して接続テストする（未確認）
- 利益計算: Etsy 手数料 ≒ 価格×9.4% + $0.96、1ドル=150円、目標利益は1個あたり約500円以下

## 決済登録（解決済み）
- 2026-09-30 Payoneer 本人確認不可でショップ休止 → 2026-10-05 Payoneer 承認・Etsy ペイメント登録完了。
- 2026-10-05 漢字Tシャツ（黒追加）を再公開（約3分で処理完了＝成功とみられる。失敗時は数秒で終わっていた）。

## 商品一覧
| 商品 | Printify ID | Etsy ID | 価格 | 利益(円) | 状態 |
|---|---|---|---|---|---|
| 漢字 Cannabis Love Tシャツ（白・黒） | 6abcac96201f7338ea0cb72f | 4585522299 | $23.99/26.99/29.99 | 422/453/518 | 2026-10-05 再公開（黒追加） |
| 漢字 黒マグ | 6abc910b31ee521b8804f585 | 4585491734 | $11.99 | 418（原価 $7.11 に値下がり） | 公開済み |
| ローズブーケ トート | 6abc785d1e33a68782095a60 | 4585451765 | $21.99 | 449 | 公開済み |
| Japan Weed Love Shop Tシャツ | 6abb4b818cf393fa7b06f121 | 4584786176 | $24.99/27.99/29.99 | 558/590/518 | 公開済み |
| 420 リーフマグ（白） | 6aba111c9c7ec344c80c3fed | 4584546414 | $9.99 | 459 | 公開済み（表紙が front のまま） |
| 420 Stoner Cats Tシャツ | 6ab98fd4d1cf99cb66083aae | 4583938426 | $37.99/39.99/42.99 | 522/432/494 | 公開済み（タイトル138字に改善済み） |
| Stoner Cats マグ（新） | 6abdfbff0a218a2b880b9cc8 | なし | $9.99 | 459 | 未公開。公開失敗で画像が1枚に減った → 属性とモックアップを画面で選び直して公開 |
| Stoner Cats マグ（旧・不具合） | 6abdf38ef3bc09b3ef01fdb0 | なし | — | — | 新マグ公開後に削除（要ユーザー確認） |

## Etsy の属性（custom_attributes）
- 未設定だと公開・更新が「Publishing error」になる。2026-10-05 に全商品へ設定済み。
- 値は文字列で送る。色の ID: 1 Black / 10 White / 11 Yellow / 1213 Beige（etsy_property:200=主色、52047899002=副色）。
- sales_channel_properties の PUT では画像は減らない（確認済み）。

## ショップの見た目（2026-10-05 設定済み）
- アイコン: 作成後ファイル/shop_icon_flag_heart_1000.png、バナー: 作成後ファイル/shop_banner_flag_heart_3360x840.png
- ロゴ: 日の丸の赤をハートにし、中に緑の大麻の葉（logo_heart_small_2000.png / logo_flag_heart_2400.png）
- ショップ文章: 作成後ファイル/shop_text.md

## Printify ストア設定（2026-10-06 確認）
- 設定は「My Etsy Store」(29108577) 側で行う（「My new store」は Etsy 未接続の別ストア）
- 注文: 承認=自動、追跡通知=自動、ルーティング=無効、遅延注文=手動。Etsy と1時間ごとに同期
- GPSR: 「EU で販売するが GPSR 情報は表示しない」を選択（EU 責任者がいないため）。求められたら EU/UK 販売制限に切替
- 支払い: カード登録済み（ユーザー申告、2026-10-06）。請求通貨 USD。API からは確認不可

## Etsy の画面操作
- クラウドのセッションからは etsy.com に届かない。画面操作は PC の Claude デスクトップアプリ＋Claude in Chrome で行う。

## 注意（API の制約）
- 画像の表紙・並び順・選択は API では変更不可。PUT すると画像が 1 枚に減ることがある → Printify 画面で選び直す
- print_areas の PUT はテキストレイヤーと洗濯表示（text_layer.svg）を送れない。テキストは PNG 化して配置、
  首にアップロード画像があれば洗濯表示は自動で付く
- 公開は POST /publish.json（送る項目をフラグで選ぶ）。価格変更・公開・削除はユーザー確認後に行う

## ファイル
- tools/printify_price.py: 価格チェック（確認のみがデフォルト）
- tools/etsy_stats.py: Etsy の閲覧数・お気に入り数・価格の一覧（確認のみ）
- 作成後ファイル/: 作成したデザイン画像（高解像度）
