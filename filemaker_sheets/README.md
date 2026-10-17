# FileMaker（club45_app 女性台帳）→ Google スプレッドシート 連動

FileMaker のボタン1つ（または一定時間ごと）で、女性台帳の内容をスプレッドシートへ丸ごと書き出します。
FileMaker Server がなくても、FileMaker Pro 単体で動きます（「URL から挿入」を使用）。

```
FileMaker（スクリプト）──JSONをPOST──▶ Apps Script（Webアプリ）──▶ スプレッドシート
```

向きは **FileMaker → スプレッドシート の一方向** です（入力は今まで通り FileMaker、シートは閲覧・集計用）。

---

## 手順1：スプレッドシート側（5分）

1. Google スプレッドシートを新規作成（名前例：「女性台帳_連動」）
2. メニュー **拡張機能 → Apps Script**
3. 中身を全部消して、`Code.gs` の内容を貼り付け
4. `const TOKEN = '...'` を自分だけの長い文字列に変更（例：`club45-k8Xq2vP9mZ`）
5. 右上 **デプロイ → 新しいデプロイ**
   - 種類：**ウェブアプリ**
   - 次のユーザーとして実行：**自分**
   - アクセスできるユーザー：**全員**（※TOKEN で守ります）
6. 承認画面で許可 → 表示された **ウェブアプリ URL**（`https://script.google.com/macros/s/.../exec`）をコピー

> コードを直したときは「デプロイを管理 → 編集 → バージョン：新バージョン」で更新すると URL が変わりません。

---

## 手順2：FileMaker 側スクリプト

FileMaker で **スクリプト → スクリプトワークスペース → 新規スクリプト**（名前：`スプレッドシート送信`）を作り、下のステップを入れます。

`女性台帳::姓` などの **フィールド名は実際のファイルに合わせて** 選び直してください（画面の見出しをもとに仮で書いています）。

```
# --- 設定 ---
変数を設定 [ $url ; 値: "https://script.google.com/macros/s/XXXXXXXX/exec" ]
変数を設定 [ $token ; 値: "club45-k8Xq2vP9mZ" ]      // Code.gs の TOKEN と同じ

# --- 送る対象：全レコード（在籍者だけなら「在籍者」の検索に変更） ---
レイアウト切り替え [ 「女性台帳」 ]
ウインドウの固定
全レコードを表示
レコードのソート [ 記憶する ; ダイアログなし ]       // 女性ID 昇順
レコード/検索条件/ページへ移動 [ 最初の ]

変数を設定 [ $rows ; 値: "[]" ]
変数を設定 [ $i ; 値: 0 ]

Loop
  変数を設定 [ $row ; 値:
    JSONSetElement ( "[]" ;
      [ 0  ; 女性台帳::女性ID          ; JSONString ] ;
      [ 1  ; 女性台帳::在籍女性No      ; JSONString ] ;
      [ 2  ; 女性台帳::女性No          ; JSONString ] ;
      [ 3  ; 女性台帳::在籍            ; JSONString ] ;
      [ 4  ; 女性台帳::売上管理表に表示 ; JSONString ] ;
      [ 5  ; 女性台帳::当日出勤        ; JSONString ] ;
      [ 6  ; 女性台帳::姓              ; JSONString ] ;
      [ 7  ; 女性台帳::名              ; JSONString ] ;
      [ 8  ; 女性台帳::姓カナ          ; JSONString ] ;
      [ 9  ; 女性台帳::名カナ          ; JSONString ] ;
      [ 10 ; 女性台帳::分類            ; JSONString ] ;
      [ 11 ; 女性台帳::担当者          ; JSONString ] ;
      [ 12 ; 女性台帳::本名            ; JSONString ] ;
      [ 13 ; 女性台帳::本名カナ        ; JSONString ] ;
      [ 14 ; GetAsText ( 女性台帳::生年月日 ) ; JSONString ] ;
      [ 15 ; GetAsText ( 女性台帳::入店日付 ) ; JSONString ] ;
      [ 16 ; 女性台帳::備考            ; JSONString ] ;
      [ 17 ; GetAsText ( 女性台帳::退店日付 ) ; JSONString ] ;
      [ 18 ; 女性台帳::メールアドレス  ; JSONString ]
    ) ]
  変数を設定 [ $rows ; 値: JSONSetElement ( $rows ; $i ; $row ; JSONArray ) ]
  変数を設定 [ $i ; 値: $i + 1 ]
  レコード/検索条件/ページへ移動 [ 次の ; 最後まできたら終了: オン ]
End Loop

# --- 送信データを組み立て ---
変数を設定 [ $json ; 値:
  JSONSetElement ( "{}" ;
    [ "token"  ; $token ; JSONString ] ;
    [ "sheet"  ; "女性台帳" ; JSONString ] ;
    [ "header" ; "[\"女性ID\",\"在籍女性No\",\"女性No\",\"在籍\",\"売上管理表に表示\",\"当日出勤\",\"姓\",\"名\",\"姓カナ\",\"名カナ\",\"分類\",\"担当者\",\"本名\",\"本名カナ\",\"生年月日\",\"入店日付\",\"備考\",\"退店日付\",\"メールアドレス\"]" ; JSONArray ] ;
    [ "rows"   ; $rows ; JSONArray ]
  ) ]

# --- 送信 ---
URL から挿入 [ 選択 ; ダイアログあり: オフ ; ターゲット: $result ; $url ;
  cURL オプション: "--location -X POST -H \"Content-Type: application/json\" --data @$json" ]

If [ JSONGetElement ( $result ; "ok" ) = 1 ]
  カスタムダイアログを表示 [ "送信完了" ; JSONGetElement ( $result ; "rows" ) & " 件をスプレッドシートに反映しました" ]
Else
  カスタムダイアログを表示 [ "送信失敗" ; $result ]
End If
```

### ボタンにする
レイアウトモードで「レコード確定」の横などにボタンを置き、スクリプト `スプレッドシート送信` を割り当て。

### 自動で送る場合（任意）
- **開くたび**：ファイル → ファイルオプション → スクリプトトリガ「OnFirstWindowOpen」
- **定期的に**：起動時スクリプトで `OnTimer スクリプトをインストール [ スプレッドシート送信 ; 間隔: 600 ]`（10分ごと。その場合ダイアログ表示は外す）
- **FileMaker Server を使っている場合**：Admin Console のスケジュールで「スクリプト実行」に登録（1日数回など）

---

## 注意（個人情報）
本名・生年月日・メールアドレスが含まれます。
- スプレッドシートの **共有は必要な人だけ**（リンク共有はオフ）
- 不要なら FileMaker スクリプトの該当行と header から外せばシートに出ません
- TOKEN は他人に教えない

## うまくいかないとき
| 症状 | 対処 |
|---|---|
| `token mismatch` | Code.gs と FileMaker の TOKEN が一致しているか |
| HTML（ログイン画面）が返る | デプロイの「アクセスできるユーザー」が「全員」になっているか |
| 何も返らない／エラー | cURL オプションに `--location` があるか、URL が `/exec` で終わっているか |
| 日付がずれる | `GetAsText()` で囲んでいるか |
