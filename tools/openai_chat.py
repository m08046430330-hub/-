#!/usr/bin/env python3
"""ChatGPT（OpenAI API）に質問を送って返事を表示する（接続確認・お試し用）。

使い方:
  1. OpenAI のAPIキーを用意する（https://platform.openai.com/api-keys）
  2. 環境変数 OPENAI_API_KEY に入れる
       Claude のクラウド環境: 環境設定のシークレット／環境変数に OPENAI_API_KEY として登録
       Windows (PowerShell):  $env:OPENAI_API_KEY="sk-..."
       Mac / Linux:           export OPENAI_API_KEY="sk-..."
  3. 実行:
       python openai_chat.py --check            # つながるかだけ確認（料金はかからない）
       python openai_chat.py "こんにちは"        # 質問して返事を表示
       python openai_chat.py --model gpt-4o-mini "質問"   # モデルを指定

Python 3.8 以上の標準ライブラリだけで動きます。
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.openai.com/v1"
DEFAULT_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")


def request(method, path, body=None):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("OPENAI_API_KEY が設定されていません。")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return json.load(res)
    except urllib.error.HTTPError as e:
        sys.exit(f"OpenAI API エラー {e.code}: {e.read().decode(errors='replace')}")
    except urllib.error.URLError as e:
        sys.exit(f"api.openai.com に接続できません: {e.reason}")


def ask(prompt, model=DEFAULT_MODEL, system=None):
    """質問を送って返事の文字列を返す（他のスクリプトから import して使える）。"""
    messages = [{"role": "system", "content": system}] if system else []
    messages.append({"role": "user", "content": prompt})
    res = request("POST", "/chat/completions", {"model": model, "messages": messages})
    return res["choices"][0]["message"]["content"]


def main():
    p = argparse.ArgumentParser(description="ChatGPT（OpenAI API）に質問する")
    p.add_argument("prompt", nargs="?", help="質問する文章")
    p.add_argument("--model", default=DEFAULT_MODEL, help=f"使うモデル（既定: {DEFAULT_MODEL}）")
    p.add_argument("--system", help="前提となる指示（任意）")
    p.add_argument("--check", action="store_true", help="接続確認だけ行う")
    args = p.parse_args()

    if args.check:
        models = request("GET", "/models")["data"]
        print(f"接続OK。使えるモデル数: {len(models)}")
        return
    if not args.prompt:
        p.error("質問する文章を指定するか、--check を付けてください")
    print(ask(args.prompt, args.model, args.system))


if __name__ == "__main__":
    main()
