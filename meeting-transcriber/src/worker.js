// 会議AI文字起こし - Cloudflare Worker
// public/ の画面を配信し、/api/* で AssemblyAI（文字起こし）と Claude（議事録）への通信を中継する。
// APIキーはすべて Worker のシークレットに置き、ブラウザには渡さない。
//
// 必要なシークレット:
//   APP_PASSCODE        利用者が画面で入力する合言葉
//   ASSEMBLYAI_API_KEY  AssemblyAI の APIキー
//   ANTHROPIC_API_KEY   Anthropic の APIキー

import Anthropic from "@anthropic-ai/sdk";

const ASSEMBLYAI = "https://api.assemblyai.com";
const MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `あなたは優秀な議事録作成アシスタントです。
会議の文字起こしを読み、日本語のMarkdownで議事録を作成してください。
音声認識の誤変換や言い淀みが含まれるため、文脈から正しい意味を推測して整理してください。

出力フォーマット:
## 概要
（3〜5行で会議全体の要約）

## 主な議題と議論内容
（議題ごとに見出しを付け、要点を箇条書き）

## 決定事項
（箇条書き。なければ「なし」）

## ToDo（アクションアイテム）
（「- [ ] 担当者：内容（期限）」の形式。担当者や期限が不明な場合は「未定」）

## 保留・次回への持ち越し
（箇条書き。なければ「なし」）

文字起こしにない情報を創作しないでください。`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (!env.APP_PASSCODE || !env.ASSEMBLYAI_API_KEY || !env.ANTHROPIC_API_KEY) {
      return json({ error: "サーバーの設定（シークレット）が完了していません。" }, 500);
    }
    if (!passcodeMatches(request.headers.get("X-App-Passcode"), env.APP_PASSCODE)) {
      return json({ error: "合言葉が正しくありません。" }, 401);
    }

    try {
      if (url.pathname === "/api/check" && request.method === "GET") {
        return json({ ok: true });
      }
      if (url.pathname === "/api/transcripts" && request.method === "POST") {
        return await createTranscript(request, env, url);
      }
      const match = url.pathname.match(/^\/api\/transcripts\/([\w-]+)$/);
      if (match && request.method === "GET") {
        return await getTranscript(match[1], env);
      }
      if (url.pathname === "/api/summary" && request.method === "POST") {
        return await summarize(request, env);
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "サーバーでエラーが発生しました。" }, 500);
    }
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function passcodeMatches(given, expected) {
  if (typeof given !== "string") return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function assemblyai(env, path, init = {}) {
  const res = await fetch(ASSEMBLYAI + path, {
    ...init,
    headers: { Authorization: env.ASSEMBLYAI_API_KEY, ...init.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("AssemblyAI error", res.status, data);
    const err = new Error(data.error || `AssemblyAI ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// 録音ファイルを受け取り、AssemblyAI にアップロードして文字起こしを開始する
async function createTranscript(request, env, url) {
  if (!request.body) return json({ error: "音声データがありません。" }, 400);

  const language = (url.searchParams.get("lang") || "ja").replace(/[^a-z_]/g, "");
  const speakers = Number(url.searchParams.get("speakers")) || null;

  try {
    const upload = await assemblyai(env, "/v2/upload", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: request.body,
      duplex: "half", // 録音データをストリームのまま転送する
    });
    const transcript = await assemblyai(env, "/v2/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_url: upload.upload_url,
        speech_models: ["universal-3-5-pro", "universal-2"],
        language_code: language,
        speaker_labels: true,
        ...(speakers ? { speakers_expected: speakers } : {}),
      }),
    });
    return json({ id: transcript.id, status: transcript.status });
  } catch (err) {
    return json({ error: `文字起こしを開始できませんでした：${err.message}` }, 502);
  }
}

async function getTranscript(id, env) {
  try {
    const t = await assemblyai(env, `/v2/transcript/${id}`);
    if (t.status === "error") {
      return json({ status: "error", error: t.error || "文字起こしに失敗しました。" });
    }
    if (t.status !== "completed") {
      return json({ status: t.status });
    }
    const utterances = (t.utterances || []).map((u) => ({
      start: u.start,
      speaker: u.speaker,
      text: u.text,
    }));
    return json({ status: "completed", utterances, text: t.text || "" });
  } catch (err) {
    return json({ error: `文字起こしの状態を取得できませんでした：${err.message}` }, 502);
  }
}

// 文字起こしを Claude に送り、議事録をテキストのストリームとして返す
async function summarize(request, env) {
  const body = await request.json().catch(() => null);
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) return json({ error: "文字起こしがありません。" }, 400);
  const title = String(body.title || "無題の会議").slice(0, 200);
  const date = String(body.date || "").slice(0, 50);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `会議名：${title}\n日付：${date}\n\n<transcript>\n${transcript}\n</transcript>`,
      },
    ],
  });

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          await writer.write(encoder.encode(event.delta.text));
        }
      }
      const message = await stream.finalMessage();
      if (message.stop_reason === "refusal") {
        await writer.write(encoder.encode("\n\n[エラー] AIがこの内容の処理を辞退しました。"));
      } else if (message.stop_reason === "max_tokens") {
        await writer.write(encoder.encode("\n\n（出力が長すぎたため途中で終了しました）"));
      }
    } catch (err) {
      console.error("Claude error", err);
      await writer.write(encoder.encode(`\n\n[エラー] ${claudeErrorMessage(err)}`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function claudeErrorMessage(err) {
  if (err instanceof Anthropic.AuthenticationError) return "Anthropic APIキーが正しくありません。";
  if (err instanceof Anthropic.RateLimitError) return "利用上限に達しました。しばらく待ってから再度お試しください。";
  if (err instanceof Anthropic.APIConnectionError) return "Anthropic APIに接続できませんでした。";
  if (err instanceof Anthropic.APIError) {
    if (err.status === 402) return "Anthropic のクレジットが不足しています。";
    if (err.status >= 500) return "Anthropic APIが一時的に利用できません。時間をおいて再度お試しください。";
    return `Anthropic APIエラー（${err.status}）`;
  }
  return "議事録の作成中にエラーが発生しました。";
}
