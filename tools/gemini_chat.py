#!/usr/bin/env python3
"""Gemini（Google AI Studio の API）に質問を送って返事を表示する（接続確認・お試し用）。

無料枠あり（回数制限あり）。カード登録なしで使えます。

使い方:
  1. APIキーを作る: https://aistudio.google.com/apikey で「APIキーを作成」
  2. キーを設定する（どちらか）
       Claude のクラウド環境: ネットワークシークレットに generativelanguage.googleapis.com 用として登録
                              （ヘッダー x-goog-api-key）。または環境変数 GEMINI_API_KEY に登録
       Windows (PowerShell):  $env:GEMINI_API_KEY="AIza..."
       Mac / Linux:           export GEMINI_API_KEY="AIza..."
  3. 実行:
       python gemini_chat.py --check            # つながるか確認し、使えるモデルを表示
       python gemini_chat.py "こんにちは"        # 質問して返事を表示
       python gemini_chat.py --model gemini-3.5-flash-lite "質問"   # モデルを指定

Python 3.9 以上の標準ライブラリだけで動きます。
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")


def request(method, path, body=None):
    # ネットワークシークレットでプロキシがキーを付ける環境では、環境変数は不要（仮の値を送ると置き換えられる）
    key = os.environ.get("GEMINI_API_KEY") or "proxy-injected"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={"x-goog-api-key": key, "Content-Type": "application/json"},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                return json.load(res)
        except urllib.error.HTTPError as e:
            code, msg = e.code, e.read().decode(errors="replace")
        except urllib.error.URLError as e:
            sys.exit(f"generativelanguage.googleapis.com に接続できません: {e.reason}")
        if code < 500 or attempt == 2:
            break
        time.sleep(5 * (attempt + 1))  # 混雑などの一時的なエラーは少し待って再試行

    if code in (400, 401, 403) and not os.environ.get("GEMINI_API_KEY"):
        sys.exit("APIキーが届いていません。GEMINI_API_KEY かネットワークシークレットを設定してください。\n" + msg)
    if code == 429:
        sys.exit("無料枠の回数制限に達しました。少し待ってから再実行してください。\n" + msg)
    if code >= 500:
        sys.exit(f"Gemini が混雑しています（{code}）。時間をおくか --model で別のモデルを指定してください。\n" + msg)
    sys.exit(f"Gemini API エラー {code}: {msg}")


def ask(prompt, model=DEFAULT_MODEL, system=None):
    """質問を送って返事の文字列を返す（他のスクリプトから import して使える）。"""
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    res = request("POST", f"/models/{model}:generateContent", body)
    try:
        return "".join(p.get("text", "") for p in res["candidates"][0]["content"]["parts"])
    except (KeyError, IndexError):
        sys.exit("返事を取得できませんでした: " + json.dumps(res, ensure_ascii=False))


def main():
    p = argparse.ArgumentParser(description="Gemini に質問する")
    p.add_argument("prompt", nargs="?", help="質問する文章")
    p.add_argument("--model", default=DEFAULT_MODEL, help=f"使うモデル（既定: {DEFAULT_MODEL}）")
    p.add_argument("--system", help="前提となる指示（任意）")
    p.add_argument("--check", action="store_true", help="接続確認と使えるモデルの表示")
    args = p.parse_args()

    if args.check:
        models = request("GET", "/models?pageSize=1000").get("models", [])
        names = [m["name"].removeprefix("models/") for m in models
                 if "generateContent" in m.get("supportedGenerationMethods", [])]
        print(f"接続OK。文章生成に使えるモデル: {len(names)} 個")
        for n in names:
            print("  " + n)
        return
    if not args.prompt:
        p.error("質問する文章を指定するか、--check を付けてください")
    print(ask(args.prompt, args.model, args.system))


if __name__ == "__main__":
    main()
