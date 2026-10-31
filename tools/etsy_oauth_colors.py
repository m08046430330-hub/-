#!/usr/bin/env python3
"""Etsy 書き込み用 OAuth の設定と、主色・副色の書き込み。

使い方（Etsy API の認証情報が登録されたセッションで実行）:
  1) python3 tools/etsy_oauth_colors.py auth
       → 表示された URL をブラウザで開き、ご自身で「許可」を押す
       → 移動先 URL の ?code=... の部分をコピー
  2) python3 tools/etsy_oauth_colors.py token <code>
       → .etsy_token.json に保存（.gitignore に追加すること。中身は表示しない）
  3) python3 tools/etsy_oauth_colors.py colors --dry-run   （送る内容の確認だけ）
     python3 tools/etsy_oauth_colors.py colors             （本番。主色・副色を書き込む）

必要な環境変数:
  ETSY_API_KEY       "keystring:shared_secret"（1行・半角コロン）
  ETSY_REDIRECT_URI  Etsy 開発者ページのアプリに登録したコールバック URL（完全一致）
  ETSY_REFRESH_TOKEN （任意）.etsy_token.json が無いときに使う更新用の鍵。
                     これがあれば新しいセッションでも auth なしで書き込める（発行から約90日有効）

鍵が使えるかの確認だけ: python3 tools/etsy_oauth_colors.py check
"""
import base64, hashlib, json, os, secrets, sys, time, urllib.error, urllib.parse, urllib.request

SHOP_ID = 68269935
STATE_FILE = ".etsy_oauth_state.json"
TOKEN_FILE = ".etsy_token.json"
SCOPES = "listings_r listings_w shops_r shops_w transactions_r"
PRIMARY, SECONDARY = 200, 52047899002
COLOR_IDS = {"Black": 1, "Green": 4, "Red": 9, "White": 10, "Yellow": 11, "Beige": 1213}

# 残り5件（etsy_color_guide.md と 2026-10-17 の確認に合わせた値）
TARGETS = [
    (4595706234, "名入れTシャツ", "Black", "White"),
    (4594919024, "盆栽トート", "Beige", "Green"),
    (4592364716, "Stoner Mouse 長袖", "White", "Black"),
    (4584546414, "420 リーフマグ", "White", "Red"),
    (4585451765, "ローズブーケ トート", "Beige", "Red"),
]


def api_key():
    k = os.environ.get("ETSY_API_KEY", "").strip()
    if ":" not in k:
        sys.exit("ETSY_API_KEY（keystring:shared_secret）が見つかりません")
    return k


def redirect_uri():
    r = os.environ.get("ETSY_REDIRECT_URI", "").strip()
    if not r:
        sys.exit("ETSY_REDIRECT_URI が未設定です（Etsy のアプリに登録した URL）")
    return r


def post_form(url, data, headers=None):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode(), headers=headers or {}, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def save_token(t):
    t["expires_at"] = time.time() + int(t.get("expires_in", 3600)) - 60
    with open(TOKEN_FILE, "w") as f:
        json.dump(t, f)
    os.chmod(TOKEN_FILE, 0o600)


def cmd_auth():
    keystring = api_key().split(":")[0]
    verifier = secrets.token_urlsafe(64)[:96]
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = secrets.token_urlsafe(16)
    with open(STATE_FILE, "w") as f:
        json.dump({"verifier": verifier, "state": state}, f)
    os.chmod(STATE_FILE, 0o600)
    q = urllib.parse.urlencode({
        "response_type": "code", "client_id": keystring, "redirect_uri": redirect_uri(),
        "scope": SCOPES, "state": state, "code_challenge": challenge, "code_challenge_method": "S256",
    }, quote_via=urllib.parse.quote)
    print("この URL をブラウザで開いて「許可」を押してください:\n")
    print("https://www.etsy.com/oauth/connect?" + q)


def cmd_token(code):
    st = json.load(open(STATE_FILE))
    t = post_form("https://api.etsy.com/v3/public/oauth/token", {
        "grant_type": "authorization_code", "client_id": api_key().split(":")[0],
        "redirect_uri": redirect_uri(), "code": code, "code_verifier": st["verifier"],
    })
    save_token(t)
    os.remove(STATE_FILE)
    print("トークンを保存しました（" + TOKEN_FILE + "）。有効期限が切れても refresh_token で自動更新します。")


def refresh(refresh_token):
    try:
        t = post_form("https://api.etsy.com/v3/public/oauth/token", {
            "grant_type": "refresh_token", "client_id": api_key().split(":")[0],
            "refresh_token": refresh_token,
        })
    except urllib.error.HTTPError as e:
        sys.exit(f"更新用の鍵が使えません（{e.code}）。auth からやり直し、"
                 "環境設定の ETSY_REFRESH_TOKEN も新しい値に入れ替えてください")
    save_token(t)
    return t


def access_token():
    if os.path.exists(TOKEN_FILE):
        t = json.load(open(TOKEN_FILE))
    else:
        r = os.environ.get("ETSY_REFRESH_TOKEN", "").strip()
        if not r:
            sys.exit("鍵がありません。auth → token を行うか、環境設定に ETSY_REFRESH_TOKEN を入れてください")
        t = refresh(r)
    if time.time() > t.get("expires_at", 0):
        t = refresh(t["refresh_token"])
    return t["access_token"]


def cmd_check():
    url = f"https://api.etsy.com/v3/application/shops/{SHOP_ID}/listings/{TARGETS[0][0]}/properties"
    req = urllib.request.Request(url, headers={"x-api-key": api_key(), "Authorization": "Bearer " + access_token()})
    with urllib.request.urlopen(req) as r:
        json.load(r)
    print("OK: Etsy の鍵は使えます（権限: " + json.load(open(TOKEN_FILE)).get("scope", "?") + "）")


def put_property(listing_id, prop, color):
    url = f"https://api.etsy.com/v3/application/shops/{SHOP_ID}/listings/{listing_id}/properties/{prop}"
    body = urllib.parse.urlencode({"value_ids": COLOR_IDS[color], "values": color}).encode()
    req = urllib.request.Request(url, data=body, method="PUT", headers={
        "x-api-key": api_key(), "Authorization": "Bearer " + access_token(),
        "Content-Type": "application/x-www-form-urlencoded",
    })
    with urllib.request.urlopen(req) as r:
        return r.status


def cmd_colors(dry):
    for lid, name, main, sub in TARGETS:
        print(f"{name} ({lid}): 主色 {main} / 副色 {sub}", end="")
        if dry:
            print("  [確認のみ]")
            continue
        try:
            s1 = put_property(lid, PRIMARY, main)
            s2 = put_property(lid, SECONDARY, sub)
            print(f"  → {s1}/{s2}")
        except urllib.error.HTTPError as e:
            print(f"  → エラー {e.code}: {e.read().decode()[:200]}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "auth":
        cmd_auth()
    elif a[0] == "token" and len(a) == 2:
        cmd_token(a[1])
    elif a[0] == "check":
        cmd_check()
    elif a[0] == "colors":
        cmd_colors("--dry-run" in a)
    else:
        sys.exit(__doc__)
