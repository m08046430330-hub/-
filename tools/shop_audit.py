#!/usr/bin/env python3
"""ショップ全体の一括点検（確認だけ・何も変更しない）。

Etsy と Printify の情報を読み、全出品の問題点を一覧表にする。
GET（読み取り）しか送らないので、何回実行しても安全です。

使い方:
  python3 tools/shop_audit.py                      # 画面に表示
  python3 tools/shop_audit.py --out check_audit.md # 表をファイルにも保存

点検する項目:
  - タグ（0件・13件未満・重複）、タイトルの長さ
  - 写真の枚数・写真の説明文（代替テキスト）
  - 主色・副色、セクション、自動更新、作った人（who_made）の揃い
  - 在庫（数が少ないバリエーション）
  - 配送設定（アメリカ送料無料か、「その他の国」へ送れるか）、説明文の「Free shipping」の1行
  - 1個あたりの利益（目標 約500円。--min-yen / --max-yen で変更）
  - Printify と Etsy のタイトル・タグのずれ（Printify から再公開すると Etsy 側が上書きされる）

在庫・配送設定・属性の一部は Etsy の書き込み用の鍵（tools/etsy_oauth_colors.py と同じ）で読む。
鍵が無い場合、その項目は飛ばして残りを点検する。
"""
import argparse
import collections
import datetime
import html
import json
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

SHOP_ID = 68269935
PRINTIFY_SHOP = 29108577
PRINTIFY = "https://api.printify.com/v1"
ETSY_PUBLIC = "https://openapi.etsy.com/v3/application"
ETSY_OAUTH = "https://api.etsy.com/v3/application"
PRIMARY, SECONDARY = 200, 52047899002
FREE_LINE = "free shipping to the usa"
NO_FREE_SHIPPING_SECTIONS = {"Stickers"}  # ユーザー決定（2026-10-31）: ステッカーは送料そのまま
YEN_PER_USD = 150
FEE_RATE, FEE_FIXED = 0.094, 0.96         # Etsy 手数料 ≒ 価格×9.4% + $0.96
LOW_STOCK = 10

BAD, WARN = "要対応", "注意"


def get(url, headers):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"APIエラー {e.code} ({url.split('?')[0]}): {e.read().decode()[:200]}")


# ---------- Printify ----------
PH = {"User-Agent": "printify-price-script"}
if os.environ.get("PRINTIFY_TOKEN"):
    PH["Authorization"] = "Bearer " + os.environ["PRINTIFY_TOKEN"]


def printify_products():
    out, page = [], 1
    while True:
        r = get(f"{PRINTIFY}/shops/{PRINTIFY_SHOP}/products.json?limit=50&page={page}", PH)
        out += r["data"]
        if page >= r.get("last_page", 1):
            return out
        page += 1


_ship_cache = {}


def printify_us_shipping(blueprint, provider):
    """{variant_id: アメリカ1個目の送料（ドル）}"""
    key = (blueprint, provider)
    if key not in _ship_cache:
        r = get(f"{PRINTIFY}/catalog/blueprints/{blueprint}/print_providers/{provider}/shipping.json", PH)
        m = {}
        for prof in r.get("profiles", []):
            if "US" in prof.get("countries", []):
                for v in prof["variant_ids"]:
                    m[v] = prof["first_item"]["cost"] / 100
        _ship_cache[key] = m
    return _ship_cache[key]


# ---------- Etsy ----------
EH = {"User-Agent": "shop-audit-script"}
if os.environ.get("ETSY_API_KEY"):
    EH["x-api-key"] = os.environ["ETSY_API_KEY"]


def etsy_active_listings():
    out, offset = [], 0
    while True:
        r = get(f"{ETSY_PUBLIC}/shops/{SHOP_ID}/listings/active?limit=100&offset={offset}", EH)
        out += r["results"]
        offset += 100
        if offset >= r["count"]:
            break
    # 写真は batch でまとめて取る（100件ずつ）
    images = {}
    for i in range(0, len(out), 100):
        ids = ",".join(str(l["listing_id"]) for l in out[i:i + 100])
        for l in get(f"{ETSY_PUBLIC}/listings/batch?listing_ids={ids}&includes=Images", EH)["results"]:
            images[l["listing_id"]] = l.get("images") or []
    for l in out:
        l["images"] = images.get(l["listing_id"], [])
    return out


def oauth_headers():
    """書き込み用の鍵で読む（無ければ None）。鍵の中身は表示しない。"""
    try:
        import etsy_oauth_colors as eo
        import io, contextlib
        with contextlib.redirect_stdout(io.StringIO()):
            token = eo.access_token()
        return {"x-api-key": eo.api_key(), "Authorization": "Bearer " + token, "User-Agent": "shop-audit-script"}
    except BaseException as e:  # sys.exit も含めて受け止める
        print(f"(Etsy の書き込み用の鍵が使えないため、在庫・配送設定の点検を飛ばします: {e})", file=sys.stderr)
        return None


def money(p):
    return p["amount"] / p["divisor"]


# ---------- 点検 ----------
def audit(args):
    listings = etsy_active_listings()
    sections = {s["shop_section_id"]: s["title"]
                for s in get(f"{ETSY_PUBLIC}/shops/{SHOP_ID}/sections", EH)["results"]}
    oh = oauth_headers()

    profiles = {}
    if oh:
        for p in get(f"{ETSY_OAUTH}/shops/{SHOP_ID}/shipping-profiles", oh)["results"]:
            profiles[p["shipping_profile_id"]] = p

    pf = printify_products()
    pf_by_etsy = {str((p.get("external") or {}).get("id")): p for p in pf if (p.get("external") or {}).get("id")}

    who_counts = collections.Counter(l["who_made"] for l in listings)
    usual_who = who_counts.most_common(1)[0][0] if who_counts else None

    report = []   # (listing, [(level, text)])
    for l in sorted(listings, key=lambda x: x["title"]):
        lid = l["listing_id"]
        issues = []
        add = lambda lv, t: issues.append((lv, t))
        section = sections.get(l["shop_section_id"])
        desc = (l.get("description") or "").lower()

        # タグ・タイトル
        tags = l.get("tags") or []
        if not tags:
            add(BAD, "タグが0件")
        elif len(tags) < 13:
            add(WARN, f"タグが{len(tags)}件（13件まで入れられる）")
        dup = [t for t, c in collections.Counter(t.lower() for t in tags).items() if c > 1]
        if dup:
            add(WARN, "タグが重複: " + ", ".join(dup))
        if len(l["title"]) > 140:
            add(BAD, f"タイトルが{len(l['title'])}字（140字まで）")

        # 写真
        imgs = l["images"]
        if len(imgs) < 5:
            add(WARN, f"写真が{len(imgs)}枚（5枚以上がおすすめ）")
        no_alt = sum(1 for i in imgs if not (i.get("alt_text") or "").strip())
        if no_alt:
            add(WARN, f"写真の説明文なし {no_alt}/{len(imgs)}枚")

        # 基本設定
        if not l.get("should_auto_renew"):
            add(WARN, "自動更新がOFF（期限が来ると出品が終わる）")
        if not section:
            add(WARN, "セクション（棚）が未設定")
        if usual_who and l["who_made"] != usual_who:
            add(WARN, f"作った人が {l['who_made']}（他の出品は {usual_who}）")

        # 主色・副色（公開 API で読める）
        try:
            props = get(f"{ETSY_PUBLIC}/shops/{SHOP_ID}/listings/{lid}/properties", EH)["results"]
            have = {p["property_id"] for p in props if p.get("values")}
            if PRIMARY not in have:
                add(WARN, "主色が未入力")
            if SECONDARY not in have:
                add(WARN, "副色が未入力")
        except RuntimeError as e:
            add(WARN, f"属性を読めず: {e}")

        # 配送設定
        expect_free = section not in NO_FREE_SHIPPING_SECTIONS
        us_free = None
        prof = profiles.get(l["shipping_profile_id"])
        if oh and not prof:
            add(BAD, f"配送設定 {l['shipping_profile_id']} が見つからない")
        if prof:
            dests = prof.get("shipping_profile_destinations", [])
            us = [d for d in dests if d.get("destination_country_iso") == "US"]
            if us:
                us_free = money(us[0]["primary_cost"]) == 0
            everywhere = any(d.get("destination_country_iso") == "" and d.get("destination_region") == "none"
                             for d in dests)
            if not everywhere:
                countries = sorted({d.get("destination_country_iso") or d.get("destination_region") for d in dests})
                add(WARN, "「その他の国」へ送れない（送り先: " + ", ".join(countries) + "）")
            if expect_free and us_free is False:
                add(BAD, f"アメリカ送料が ${money(us[0]['primary_cost']):.2f}（送料無料の方針）")
        if expect_free and FREE_LINE not in desc:
            add(WARN, "説明文に「Free shipping to the USA」の1行がない")
        if not expect_free and FREE_LINE in desc:
            add(BAD, "送料無料ではないのに説明文に「Free shipping to the USA」がある")

        # 在庫・Etsy の値段（バリエーションごと）
        etsy_price_by_sku = {}
        if oh:
            try:
                inv = get(f"{ETSY_OAUTH}/listings/{lid}/inventory", oh)
                low = []
                for prod in inv["products"]:
                    for off in prod["offerings"]:
                        if off["is_enabled"] and not off["is_deleted"]:
                            etsy_price_by_sku[prod.get("sku")] = money(off["price"])
                            if off["quantity"] < LOW_STOCK:
                                low.append(off["quantity"])
                if low:
                    add(WARN, f"在庫が少ないバリエーション {len(low)}件（最少 {min(low)}個）")
            except RuntimeError as e:
                add(WARN, f"在庫を読めず: {e}")

        # Printify と比べる
        p = pf_by_etsy.get(str(lid))
        if not p:
            add(WARN, "Printify の商品が見つからない（つながりが切れている？）")
        else:
            if p["title"].strip() != html.unescape(l["title"]).strip():
                add(WARN, "Printify とタイトルが違う（Printify から再公開すると Etsy 側が上書きされる）")
            if sorted(t.lower() for t in p.get("tags", [])) != sorted(html.unescape(t).lower() for t in tags):
                add(WARN, "Printify とタグが違う（再公開でタグを送ると上書きされる）")
            if expect_free and FREE_LINE in desc and FREE_LINE not in (p.get("description") or "").lower():
                add(WARN, "Printify の説明文に送料無料の1行がない（説明文を送り直すと消える）")

            # 利益
            ship = printify_us_shipping(p["blueprint_id"], p["print_provider_id"])
            profits = []
            for v in p["variants"]:
                if not v.get("is_enabled"):
                    continue
                price = etsy_price_by_sku.get(v.get("sku"), v["price"] / 100)
                if abs(price - v["price"] / 100) > 0.005:
                    add(WARN, f"値段が Etsy ${price:.2f} / Printify ${v['price'] / 100:.2f} でずれている（{v['title']}）")
                cost = v["cost"] / 100 + (ship.get(v["id"], 0) if expect_free else 0)
                profits.append((price * (1 - FEE_RATE) - FEE_FIXED - cost) * YEN_PER_USD)
            if profits:
                lo, hi = min(profits), max(profits)
                l["_profit"] = (lo, hi)
                if lo < args.min_yen:
                    known = "・ユーザー決定でそのまま" if not expect_free else ""
                    add(BAD if lo < 0 else WARN, f"利益が少ないバリエーションあり（最少 {lo:.0f}円{known}）")
                if hi > args.max_yen:
                    add(WARN, f"利益が多めのバリエーションあり（最大 {hi:.0f}円、値下げの余地）")

        report.append((l, issues))

    etsy_ids = {str(l["listing_id"]) for l in listings}
    pf_only = [p for p in pf if str((p.get("external") or {}).get("id")) not in etsy_ids]
    return report, pf_only, oh is not None


def render(report, pf_only, with_oauth, args):
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
    n_bad = sum(1 for _, iss in report for lv, _ in iss if lv == BAD)
    n_warn = sum(1 for _, iss in report for lv, _ in iss if lv == WARN)
    ok = [l for l, iss in report if not iss]
    L = [f"# ショップ一括点検（{now} 日本時間）", "",
         "確認のみ（GET のみ・何も変更していません）。`python3 tools/shop_audit.py` で作成。", "",
         f"- 公開中の出品: {len(report)}件 / 問題なし: {len(ok)}件",
         f"- **{BAD}: {n_bad}件** / {WARN}: {n_warn}件",
         f"- 利益の目安: {args.min_yen}〜{args.max_yen}円（Etsy 手数料 9.4%+$0.96、1ドル={YEN_PER_USD}円、送料無料の商品はアメリカ送料を差し引き）"]
    if not with_oauth:
        L.append("- ※ 書き込み用の鍵が使えなかったため、在庫・配送設定・Etsy 側の値段は点検していません")
    L += ["", "## 出品ごとの結果", "", "| 出品 | 価格 | 利益(円) | 問題 |", "|---|---|---|---|"]
    order = sorted(report, key=lambda r: (-sum(lv == BAD for lv, _ in r[1]), -len(r[1]), r[0]["title"]))
    for l, iss in order:
        name = f"[{l['title'][:45]}]({l['url'].split('?')[0]}) ({l['listing_id']})"
        prof = l.get("_profit")
        prof_s = "-" if not prof else (f"{prof[0]:.0f}" if round(prof[0]) == round(prof[1]) else f"{prof[0]:.0f}〜{prof[1]:.0f}")
        probs = "<br>".join(f"**{lv}** {t}" if lv == BAD else f"{lv} {t}" for lv, t in iss) or "なし"
        L.append(f"| {name} | ${money(l['price']):.2f} | {prof_s} | {probs} |")

    # 同じ問題をまとめて数える（頼むときに便利）
    kinds = collections.Counter(t.split("（")[0].split(" ")[0] if t.startswith("写真の説明文") else t.split("（")[0]
                                for _, iss in report for _, t in iss)
    if kinds:
        L += ["", "## 問題の種類ごとの件数", "", "| 問題 | 件数 |", "|---|---|"]
        L += [f"| {k} | {c} |" for k, c in kinds.most_common()]

    if pf_only:
        L += ["", "## Printify にあって Etsy で公開されていない商品（下書きなど）", ""]
        L += [f"- {p['title'][:70]}（{p['id']}）" for p in pf_only]
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", help="結果を保存する Markdown ファイル")
    ap.add_argument("--min-yen", type=int, default=450, help="これより利益が少ないと注意（既定 450円）")
    ap.add_argument("--max-yen", type=int, default=700, help="これより利益が多いと注意（既定 700円）")
    args = ap.parse_args()
    try:
        report, pf_only, with_oauth = audit(args)
    except RuntimeError as e:
        sys.exit(str(e))
    text = render(report, pf_only, with_oauth, args)
    print(text)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"{args.out} に保存しました。")


if __name__ == "__main__":
    main()
