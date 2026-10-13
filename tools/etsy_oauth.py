#!/usr/bin/env python3
"""Etsy のリフレッシュトークンから、毎回アクセストークン（1時間有効）を取り直す。

ほかのスクリプトから使う:
    from etsy_oauth import etsy_request
    etsy_request("GET", "/application/shops/68269935/listings/4585522299/properties")

単体で動かすと、トークンが取れるか・どのユーザーかを確認するだけ（何も変更しない）:
    python etsy_oauth.py

必要な環境変数:
  ETSY_REFRESH_TOKEN  OAuth（PKCE）で取ったリフレッシュトークン（90日有効。使っても古いものは消えない）
  ETSY_API_KEY        「キーストリング:共有された秘密」。プロキシが x-api-key を付ける環境では不要
任意:
  ETSY_CLIENT_ID      既定 tuhrub70hmo9xzdz4swtxgpz（キーストリング）
  ETSY_API_HOST       既定 api.etsy.com。クラウド環境のプロキシは openapi.etsy.com 宛ての
                      Authorization を自分の資格情報で上書きするため、書き込みは api.etsy.com を使う

Python 3.8 以上の標準ライブラリだけで動きます。
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

CLIENT_ID = os.environ.get("ETSY_CLIENT_ID", "tuhrub70hmo9xzdz4swtxgpz")
HOST = os.environ.get("ETSY_API_HOST", "api.etsy.com")
BASE = f"https://{HOST}/v3"

_cache = {"token": None, "expires": 0.0}


def _send(req):
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            body = res.read().decode()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        sys.exit(f"APIエラー {e.code} ({req.get_method()} {req.full_url}): {e.read().decode()[:300]}")
    except urllib.error.URLError as e:
        sys.exit(f"接続できません ({req.full_url}): {e.reason}")


def access_token():
    """リフレッシュトークンで新しいアクセストークンを取る（同じ実行中は使い回す）。"""
    if _cache["token"] and time.time() < _cache["expires"] - 60:
        return _cache["token"]
    refresh = os.environ.get("ETSY_REFRESH_TOKEN")
    if not refresh:
        sys.exit("環境変数 ETSY_REFRESH_TOKEN がありません（環境設定に入れて、新しいセッションで実行）")
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "client_id": CLIENT_ID,
        "refresh_token": refresh,
    }).encode()
    r = _send(urllib.request.Request(f"{BASE}/public/oauth/token", data=data))
    _cache["token"] = r["access_token"]
    _cache["expires"] = time.time() + int(r.get("expires_in", 3600))
    return _cache["token"]


def etsy_request(method, path, form=None):
    """Etsy API を呼ぶ。path は "/application/..."。form は dict（値がリストなら key[] で送る）。"""
    h = {"Authorization": f"Bearer {access_token()}", "User-Agent": "etsy-oauth-script"}
    if os.environ.get("ETSY_API_KEY"):
        h["x-api-key"] = os.environ["ETSY_API_KEY"]
    data = None
    if form is not None:
        pairs = []
        for k, v in form.items():
            if isinstance(v, (list, tuple)):
                pairs += [(f"{k}[]", x) for x in v]
            else:
                pairs.append((k, v))
        data = urllib.parse.urlencode(pairs).encode()
        h["Content-Type"] = "application/x-www-form-urlencoded"
    return _send(urllib.request.Request(BASE + path, data=data, headers=h, method=method))


if __name__ == "__main__":
    token = access_token()
    me = etsy_request("GET", "/application/users/me")
    print(f"OK: アクセストークン取得（ユーザー {me.get('user_id')}・ショップ {me.get('shop_id')}）")
