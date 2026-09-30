// Worker の単体テスト（外部APIは fetch をモックして検証）
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

const env = {
  APP_PASSCODE: "secret",
  ASSEMBLYAI_API_KEY: "aai-key",
  ANTHROPIC_API_KEY: "sk-ant-test",
  ASSETS: { fetch: async () => new Response("asset") },
};
const auth = { "X-App-Passcode": "secret" };
let calls;
let routes;

beforeEach(() => {
  calls = [];
  routes = [];
  globalThis.fetch = async (input, init = {}) => {
    const req = new Request(input, init);
    const body = req.method === "GET" ? null : await req.clone().text();
    calls.push({ url: req.url, method: req.method, headers: req.headers, body });
    for (const [match, respond] of routes) if (req.url.includes(match)) return respond(req, body);
    throw new Error(`unexpected fetch ${req.url}`);
  };
});

function sse(events) {
  const text = events.map(([type, data]) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`).join("");
  return new Response(text, { headers: { "content-type": "text/event-stream" } });
}

test("serves static assets for non-API paths", async () => {
  const res = await worker.fetch(new Request("https://x/"), env);
  assert.equal(await res.text(), "asset");
});

test("rejects wrong passcode", async () => {
  const res = await worker.fetch(new Request("https://x/api/check", { headers: { "X-App-Passcode": "nope" } }), env);
  assert.equal(res.status, 401);
  const ok = await worker.fetch(new Request("https://x/api/check", { headers: auth }), env);
  assert.equal(ok.status, 200);
});

test("uploads audio and starts diarized transcription", async () => {
  routes.push(["/v2/upload", () => Response.json({ upload_url: "https://cdn/audio" })]);
  routes.push(["/v2/transcript", () => Response.json({ id: "t1", status: "queued" })]);
  const res = await worker.fetch(
    new Request("https://x/api/transcripts?lang=ja", { method: "POST", headers: auth, body: "AUDIO" }),
    env,
  );
  assert.deepEqual(await res.json(), { id: "t1", status: "queued" });
  assert.equal(calls[0].body, "AUDIO");
  assert.equal(calls[0].headers.get("authorization"), "aai-key");
  const params = JSON.parse(calls[1].body);
  assert.equal(params.audio_url, "https://cdn/audio");
  assert.equal(params.language_code, "ja");
  assert.equal(params.speaker_labels, true);
});

test("returns utterances when transcription is completed", async () => {
  routes.push([
    "/v2/transcript/t1",
    () => Response.json({ status: "completed", text: "x", utterances: [{ start: 1200, end: 2000, speaker: "A", text: "こんにちは", words: [] }] }),
  ]);
  const res = await worker.fetch(new Request("https://x/api/transcripts/t1", { headers: auth }), env);
  assert.deepEqual(await res.json(), { status: "completed", text: "x", utterances: [{ start: 1200, speaker: "A", text: "こんにちは" }] });
});

test("reports AssemblyAI failures", async () => {
  routes.push(["/v2/upload", () => Response.json({ error: "Invalid API key" }, { status: 401 })]);
  const res = await worker.fetch(new Request("https://x/api/transcripts", { method: "POST", headers: auth, body: "A" }), env);
  assert.equal(res.status, 502);
  assert.match((await res.json()).error, /Invalid API key/);
});

test("streams the Claude summary as plain text", async () => {
  routes.push([
    "api.anthropic.com",
    () =>
      sse([
        ["message_start", { message: { id: "m", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, usage: { input_tokens: 1, output_tokens: 0 } } }],
        ["content_block_start", { index: 0, content_block: { type: "text", text: "" } }],
        ["content_block_delta", { index: 0, delta: { type: "text_delta", text: "## 概要\n" } }],
        ["content_block_delta", { index: 0, delta: { type: "text_delta", text: "価格を決定" } }],
        ["content_block_stop", { index: 0 }],
        ["message_delta", { delta: { stop_reason: "end_turn" }, usage: { output_tokens: 5 } }],
        ["message_stop", {}],
      ]),
  ]);
  const res = await worker.fetch(
    new Request("https://x/api/summary", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "定例", transcript: "[00:00:01] 話者A: 価格を決めます" }),
    }),
    env,
  );
  assert.equal(await res.text(), "## 概要\n価格を決定");
  const sent = JSON.parse(calls[0].body);
  assert.equal(sent.model, "claude-opus-5-5");
  assert.equal(sent.fallbacks, "default");
  assert.match(calls[0].headers.get("anthropic-beta"), /server-side-fallback-2026-07-01/);
  assert.match(sent.messages[0].content, /価格を決めます/);
});

test("summary stream reports API errors in Japanese", async () => {
  routes.push(["api.anthropic.com", () => Response.json({ type: "error", error: { type: "authentication_error", message: "bad key" } }, { status: 401 })]);
  const res = await worker.fetch(
    new Request("https://x/api/summary", { method: "POST", headers: auth, body: JSON.stringify({ transcript: "a" }) }),
    env,
  );
  assert.match(await res.text(), /APIキーが正しくありません/);
});
