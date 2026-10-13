#!/usr/bin/env python3
"""手順書/etsy_color_guide.md の7出品に、主色（Primary color）・副色（Secondary color）を入れる。

色の2項目だけを書き込む（タイトル・タグ・値段などは送らない）。書いたあと API で読み直して確認する。

使い方:
    python etsy_set_colors.py --check   # 今の色を見るだけ（何も変更しない）
    python etsy_set_colors.py           # 書き込み → 読み直して確認

トークンの扱いは etsy_oauth.py を参照（ETSY_REFRESH_TOKEN など）。
"""
import sys

from etsy_oauth import etsy_request

SHOP_ID = 68269935
PRIMARY, SECONDARY = 200, 52047899002  # Etsy の property_id
# 色の value_id（Etsy の分類 482 Tシャツ・1062 マグ・190 トートで共通）
COLOR_IDS = {"Black": 1, "Red": 9, "White": 10, "Yellow": 11, "Beige": 1213}

# (Etsy ID, 商品, 主色, 副色) … 手順書/etsy_color_guide.md の表と同じ
LISTINGS = [
    (4585522299, "漢字Tシャツ", "White", "Black"),
    (4585491734, "漢字 黒マグ", "Black", "White"),
    (4589431758, "Stoner Mouse マグ", "White", "Black"),
    (4592364716, "Stoner Mouse 長袖", "White", "Black"),
    (4589392223, "Stoner Cats マグ", "White", "Yellow"),
    (4584546414, "420 リーフマグ", "White", "Red"),
    (4585451765, "ローズブーケ トート", "Beige", "Red"),
]


def colors(listing_id):
    r = etsy_request("GET", f"/application/shops/{SHOP_ID}/listings/{listing_id}/properties")
    got = {p["property_id"]: p["values"] for p in r["results"]}
    return ", ".join(got.get(PRIMARY, [])) or "-", ", ".join(got.get(SECONDARY, [])) or "-"


def main():
    check_only = "--check" in sys.argv
    ng = 0
    for lid, name, primary, secondary in LISTINGS:
        if not check_only:
            for pid, color in ((PRIMARY, primary), (SECONDARY, secondary)):
                etsy_request("PUT", f"/application/shops/{SHOP_ID}/listings/{lid}/properties/{pid}",
                             {"value_ids": [COLOR_IDS[color]], "values": [color]})
        p, s = colors(lid)
        ok = (p, s) == (primary, secondary)
        ng += not ok
        print(f"{'OK' if ok else '--'} {lid} {name}: 主色 {p} / 副色 {s}（予定 {primary} / {secondary}）")
    print("7件とも予定どおり" if ng == 0 else f"予定と違う: {ng}件")
    sys.exit(1 if ng and not check_only else 0)


if __name__ == "__main__":
    main()
