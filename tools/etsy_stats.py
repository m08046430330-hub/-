#!/usr/bin/env python3
"""Etsy の出品ごとの閲覧数・お気に入り数・価格を一覧表示する（確認だけ・何も変更しない）。

Printify に登録された全商品から Etsy の出品 ID を集め、Etsy Open API v3 で情報を取得する。

使い方:
  1. Etsy のAPIキー（「キーストリング:共有された秘密」）を用意する
  2. 環境変数に入れて実行（プロキシが x-api-key を自動で付ける環境では不要）
       Windows (PowerShell):  $env:ETSY_API_KEY="キーストリング:共有された秘密"
       Mac / Linux:           export ETSY_API_KEY="キーストリング:共有された秘密"
  3. 実行:
       python etsy_stats.py
     前回との差を見たい場合は記録ファイルを指定（毎回追記される）:
       python etsy_stats.py --log etsy_stats_log.csv

Printify のトークンの扱いは printify_price.py と同じ（PRINTIFY_TOKEN、またはプロキシが自動で付与）。
Python 3.8 以上の標準ライブラリだけで動きます。
"""
import argparse
import csv
import datetime
import json
import os
import sys
import urllib.error
import urllib.request

PRINTIFY = "https://api.printify.com/v1"
ETSY = "https://openapi.etsy.com/v3/application"


def get(url, headers):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"APIエラー {e.code} ({url}): {e.read().decode()[:300]}")
    except urllib.error.URLError as e:
        sys.exit(f"接続できません ({url}): {e.reason}")


def printify_listings(token):
    """Printify の全ショップ・全商品から (Etsy出品ID, 商品名) を集める。"""
    h = {"User-Agent": "printify-price-script"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    out = {}
    for shop in get(PRINTIFY + "/shops.json", h):
        page = 1
        while True:
            r = get(f"{PRINTIFY}/shops/{shop['id']}/products.json?limit=50&page={page}", h)
            for p in r["data"]:
                ext = (p.get("external") or {}).get("id")
                if ext:
                    out[str(ext)] = p["title"]
            if page >= r.get("last_page", 1):
                break
            page += 1
    return out


def last_logged(path):
    """記録ファイルから出品ごとの直近の (views, favorites) を読む。"""
    prev = {}
    if path and os.path.exists(path):
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                prev[row["listing_id"]] = (int(row["views"]), int(row["favorites"]))
    return prev


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--log", help="結果を追記するCSVファイル（前回との差も表示）")
    args = ap.parse_args()

    listings = printify_listings(os.environ.get("PRINTIFY_TOKEN"))
    if not listings:
        sys.exit("Etsy に公開済みの商品が見つかりません。")

    h = {"User-Agent": "etsy-stats-script"}
    if os.environ.get("ETSY_API_KEY"):
        h["x-api-key"] = os.environ["ETSY_API_KEY"]
    r = get(f"{ETSY}/listings/batch?listing_ids={','.join(listings)}", h)

    prev = last_logged(args.log)
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    rows = []
    print(f"{'閲覧':>6} {'(差)':>6} {'お気に入り':>8} {'(差)':>5} {'価格':>9}  状態      商品")
    for l in sorted(r["results"], key=lambda x: -x.get("views", 0)):
        lid = str(l["listing_id"])
        views, favs = l.get("views", 0), l.get("num_favorers", 0)
        pv, pf = prev.get(lid, (views, favs))
        price = l["price"]["amount"] / l["price"]["divisor"]
        print(f"{views:>6} {views - pv:>+6} {favs:>8} {favs - pf:>+5} {price:>7.2f}{l['price']['currency_code'][:1]}"
              f"  {l['state']:<8}  {l['title'][:60]}")
        rows.append({"time": now, "listing_id": lid, "views": views, "favorites": favs,
                     "price": price, "state": l["state"], "title": l["title"]})

    missing = set(listings) - {r["listing_id"] for r in rows}
    for lid in missing:
        print(f"  (Etsy から取得できず: {lid} {listings[lid]})")

    if args.log:
        new = not os.path.exists(args.log)
        with open(args.log, "a", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]))
            if new:
                w.writeheader()
            w.writerows(rows)
        print(f"\n{args.log} に記録しました。")


if __name__ == "__main__":
    main()
