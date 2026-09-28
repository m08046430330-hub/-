#!/usr/bin/env python3
"""Printify の全商品の価格を「1個あたりの利益 ≒ 目標額（円）」になるように自動設定する。

使い方:
  1. Printify の「My Profile → Connections → API tokens」でトークンを作成
  2. 環境変数にトークンを入れて実行（プロキシが認証を自動で付ける環境では不要）（トークンは誰にも送らないこと）
       Windows (PowerShell):  $env:PRINTIFY_TOKEN="ここにトークン"
       Mac / Linux:           export PRINTIFY_TOKEN="ここにトークン"
  3. まずは確認だけ（何も変更しない）:
       python printify_price.py
  4. 表示された価格で良ければ反映:
       python printify_price.py --apply
     Etsy にもすぐ反映したい場合:
       python printify_price.py --apply --publish

Python 3.8 以上の標準ライブラリだけで動きます（追加インストール不要）。
"""
import argparse
import json
import math
import os
import sys
import urllib.error
import urllib.request

API = "https://api.printify.com/v1"

# Etsy 手数料のモデル: 手数料 ≒ FEE_RATE × 販売価格 + FEE_FIXED（ドル）
# Printify の価格設定画面に表示された「Etsyの手数料」から逆算した値。
# 販売手数料・決済手数料・送料分の手数料・出品料などを含む概算。
FEE_RATE = 0.095
FEE_FIXED = 1.15


def api(method, path, token, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "User-Agent": "printify-price-script"}
    # トークンが無い場合は Authorization を付けない（プロキシが認証情報を自動で付ける環境向け）
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            text = res.read().decode()
            return json.loads(text) if text else None
    except urllib.error.HTTPError as e:
        sys.exit(f"APIエラー {e.code} ({method} {path}): {e.read().decode()[:300]}")


def price_for(cost_usd, target_usd, fee_rate=FEE_RATE, fee_fixed=FEE_FIXED):
    """利益が target_usd 以上になる最小の「○○.99ドル」を返す。"""
    raw = (cost_usd + target_usd + fee_fixed) / (1 - fee_rate)
    return math.ceil(raw - 0.99) + 0.99


def profit_for(price_usd, cost_usd, fee_rate=FEE_RATE, fee_fixed=FEE_FIXED):
    return price_usd - cost_usd - (price_usd * fee_rate + fee_fixed)


def all_products(shop_id, token):
    page = 1
    while True:
        res = api("GET", f"/shops/{shop_id}/products.json?limit=50&page={page}", token)
        yield from res.get("data", [])
        if page >= res.get("last_page", 1):
            break
        page += 1


def main():
    p = argparse.ArgumentParser(description="Printify の価格を利益目標額に合わせて一括設定")
    p.add_argument("--profit-yen", type=float, default=500, help="1個あたりの目標利益（円）既定: 500")
    p.add_argument("--rate", type=float, default=150, help="為替レート（1ドル=何円）既定: 150")
    p.add_argument("--shop", type=int, help="ショップID（省略時は Etsy に接続されたショップ）")
    p.add_argument("--apply", action="store_true", help="実際に価格を更新する（指定しないと確認のみ）")
    p.add_argument("--publish", action="store_true", help="更新後に Etsy へ価格を反映する")
    args = p.parse_args()

    # 未設定でもOK（api.printify.com 宛てに認証を自動付与する環境ではそのまま動く）
    token = os.environ.get("PRINTIFY_TOKEN")

    target_usd = args.profit_yen / args.rate

    shops = api("GET", "/shops.json", token)
    if not shops:
        sys.exit("ショップが見つかりません。")
    print("ショップ一覧:")
    for s in shops:
        print(f"  ID {s['id']}  {s['title']}  （{s.get('sales_channel', '?')}）")
    print()
    if args.shop:
        shop = next((s for s in shops if s["id"] == args.shop), None)
    else:
        # Etsy に接続されたショップを優先する
        shop = next((s for s in shops if s.get("sales_channel") == "etsy"), shops[0])
    if not shop:
        sys.exit(f"ショップID {args.shop} が見つかりません。上の一覧から --shop でIDを指定してください。")
    print(f"ショップ: {shop['title']} (ID {shop['id']})")
    print(f"目標利益: {args.profit_yen:.0f}円 ≒ {target_usd:.2f}ドル（1ドル={args.rate:.0f}円）\n")

    for product in all_products(shop["id"], token):
        variants = [v for v in product["variants"] if v.get("is_enabled")]
        if not variants:
            continue
        print(f"■ {product['title']}")
        updates = []
        for v in variants:
            cost = v["cost"] / 100
            new_price = price_for(cost, target_usd)
            profit = profit_for(new_price, cost)
            old_price = v["price"] / 100
            mark = "" if abs(old_price - new_price) < 0.005 else "  ← 変更"
            print(
                f"  {v['title']:<28} 原価 ${cost:6.2f}  価格 ${old_price:6.2f} → ${new_price:6.2f}"
                f"  利益 約${profit:.2f}（約{profit * args.rate:.0f}円）{mark}"
            )
            updates.append({"id": v["id"], "price": round(new_price * 100), "is_enabled": True})

        if args.apply:
            api("PUT", f"/shops/{shop['id']}/products/{product['id']}.json", token, {"variants": updates})
            print("  → Printify の価格を更新しました")
            if args.publish:
                api(
                    "POST",
                    f"/shops/{shop['id']}/products/{product['id']}/publish.json",
                    token,
                    {
                        "title": False,
                        "description": False,
                        "images": False,
                        "variants": True,
                        "tags": False,
                        "keyFeatures": False,
                        "shipping_template": False,
                    },
                )
                print("  → Etsy への反映を開始しました")
        print()

    if not args.apply:
        print("※ 確認のみです。反映するには --apply を付けて実行してください。")


if __name__ == "__main__":
    main()
