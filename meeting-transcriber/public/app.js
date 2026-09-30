// 会議AI文字起こし
// - 音声認識: ブラウザの Web Speech API（Chrome / Edge）
// - 録音: MediaRecorder（音声ファイルとしてダウンロード可能）
// - 高精度文字起こし・話者識別: AssemblyAI（サーバー経由）
// - AI議事録: Claude（サーバー経由）

const STORAGE = {
  passcode: "mt.passcode",
  lang: "mt.lang",
  saveAudio: "mt.saveAudio",
  history: "mt.history",
  draft: "mt.draft",
};

const $ = (id) => document.getElementById(id);
const els = {
  title: $("meetingTitle"),
  speaker: $("speakerName"),
  speakerList: $("speakerList"),
  start: $("startButton"),
  pause: $("pauseButton"),
  stop: $("stopButton"),
  status: $("status"),
  timer: $("timer"),
  level: $("level"),
  transcript: $("transcript"),
  interim: $("interim"),
  summary: $("summary"),
  summarize: $("summarizeButton"),
  history: $("history"),
  audioDownload: $("audioDownload"),
  settingsDialog: $("settingsDialog"),
  passcode: $("passcode"),
  refine: $("refineButton"),
  speakerNames: $("speakerNames"),
  lang: $("langSelect"),
  saveAudio: $("saveAudio"),
};

// ---------- 状態 ----------
const state = {
  entries: [], // { t: 経過ミリ秒, speaker, text }
  summaryMarkdown: "",
  recording: false,
  paused: false,
  elapsedBefore: 0, // 一時停止までの累積時間
  segmentStart: 0,
  stream: null,
  recorder: null,
  audioChunks: [],
  audioUrl: null,
  audioBlob: null,
  recognition: null,
  audioCtx: null,
  levelFrame: 0,
  timerId: 0,
};

// ---------- localStorage（失敗しても動作するように） ----------
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 保存できない環境では無視 */
  }
}

// ---------- ユーティリティ ----------
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}
function elapsed() {
  return state.elapsedBefore + (state.recording && !state.paused ? Date.now() - state.segmentStart : 0);
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function setStatus(text, recording = false) {
  els.status.textContent = text;
  els.status.classList.toggle("recording", recording);
}
function meetingTitle() {
  return els.title.value.trim() || "無題の会議";
}

// ---------- 文字起こし表示 ----------
function renderTranscript() {
  els.transcript.innerHTML = "";
  state.entries.forEach((entry, i) => {
    const li = document.createElement("li");
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = formatTime(entry.t);
    if (entry.speaker) {
      const sp = document.createElement("span");
      sp.className = "speaker";
      sp.textContent = entry.speaker;
      meta.appendChild(sp);
    }
    const text = document.createElement("span");
    text.className = "text";
    text.contentEditable = "true";
    text.textContent = entry.text;
    text.addEventListener("input", () => {
      state.entries[i].text = text.textContent;
      saveDraft();
    });
    li.append(meta, text);
    els.transcript.appendChild(li);
  });
  els.transcript.scrollTop = els.transcript.scrollHeight;
}

function addEntry(text) {
  const clean = text.trim();
  if (!clean) return;
  const speaker = els.speaker.value.trim();
  state.entries.push({ t: elapsed(), speaker, text: clean });
  if (speaker) rememberSpeaker(speaker);
  renderTranscript();
  saveDraft();
}

function rememberSpeaker(name) {
  const exists = [...els.speakerList.options].some((o) => o.value === name);
  if (!exists) {
    const opt = document.createElement("option");
    opt.value = name;
    els.speakerList.appendChild(opt);
  }
}

function transcriptText() {
  return state.entries
    .map((e) => `[${formatTime(e.t)}]${e.speaker ? ` ${e.speaker}:` : ""} ${e.text}`)
    .join("\n");
}

function saveDraft() {
  save(STORAGE.draft, { title: els.title.value, entries: state.entries, summary: state.summaryMarkdown });
}

// ---------- 音声認識 ----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function createRecognition() {
  const rec = new SpeechRecognition();
  rec.lang = els.lang.value;
  rec.continuous = true;
  rec.interimResults = true;

  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) addEntry(result[0].transcript);
      else interim += result[0].transcript;
    }
    els.interim.textContent = interim;
  };

  rec.onerror = (event) => {
    if (event.error === "no-speech" || event.error === "aborted") return;
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      setStatus("マイクの使用が許可されていません");
      stopRecording();
      return;
    }
    console.warn("SpeechRecognition error:", event.error);
  };

  // Chrome は無音が続くと自動で認識を終了するため、録音中は再開する
  rec.onend = () => {
    els.interim.textContent = "";
    if (state.recording && !state.paused) {
      try {
        rec.start();
      } catch {
        /* すでに開始済み */
      }
    }
  };
  return rec;
}

// ---------- 録音 ----------
async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch {
    setStatus("マイクにアクセスできませんでした");
    return;
  }

  state.stream = stream;
  state.audioBlob = null;
  els.refine.disabled = true;
  state.recording = true;
  state.paused = false;
  state.segmentStart = Date.now();

  if (els.saveAudio.checked && window.MediaRecorder) {
    state.audioChunks = [];
    // 32kbps: 1時間で約14MB。サーバーへのアップロードを軽くする
    state.recorder = new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
    state.recorder.ondataavailable = (e) => e.data.size && state.audioChunks.push(e.data);
    state.recorder.onstop = finalizeAudio;
    state.recorder.start(1000);
  }

  state.recognition = createRecognition();
  state.recognition.start();

  startLevelMeter(stream);
  state.timerId = setInterval(() => (els.timer.textContent = formatTime(elapsed())), 500);

  els.start.disabled = true;
  els.pause.disabled = false;
  els.stop.disabled = false;
  els.audioDownload.hidden = true;
  setStatus("録音中", true);
}

function togglePause() {
  if (!state.recording) return;
  if (!state.paused) {
    state.paused = true;
    state.elapsedBefore += Date.now() - state.segmentStart;
    state.recognition.stop();
    if (state.recorder?.state === "recording") state.recorder.pause();
    els.pause.textContent = "▶ 再開";
    setStatus("一時停止中");
  } else {
    state.paused = false;
    state.segmentStart = Date.now();
    try {
      state.recognition.start();
    } catch {
      /* onend で再開済み */
    }
    if (state.recorder?.state === "paused") state.recorder.resume();
    els.pause.textContent = "❚❚ 一時停止";
    setStatus("録音中", true);
  }
}

function stopRecording() {
  if (!state.recording) return;
  if (!state.paused) state.elapsedBefore += Date.now() - state.segmentStart;
  state.recording = false;
  state.paused = false;

  state.recognition?.stop();
  if (state.recorder && state.recorder.state !== "inactive") state.recorder.stop();
  state.stream?.getTracks().forEach((t) => t.stop());
  stopLevelMeter();
  clearInterval(state.timerId);
  els.timer.textContent = formatTime(state.elapsedBefore);

  els.start.disabled = false;
  els.pause.disabled = true;
  els.stop.disabled = true;
  els.pause.textContent = "❚❚ 一時停止";
  els.interim.textContent = "";
  setStatus("録音終了");
}

function finalizeAudio() {
  if (!state.audioChunks.length) return;
  const type = state.recorder.mimeType || "audio/webm";
  const blob = new Blob(state.audioChunks, { type });
  state.audioBlob = blob;
  els.refine.disabled = false;
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioUrl = URL.createObjectURL(blob);
  const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
  els.audioDownload.href = state.audioUrl;
  els.audioDownload.download = `${meetingTitle()}.${ext}`;
  els.audioDownload.hidden = false;
  if (load(STORAGE.passcode, "")) refineTranscript();
}

// ---------- 音量メーター ----------
function startLevelMeter(stream) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  state.audioCtx = new Ctx();
  const analyser = state.audioCtx.createAnalyser();
  analyser.fftSize = 256;
  state.audioCtx.createMediaStreamSource(stream).connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  const ctx = els.level.getContext("2d");
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();

  const draw = () => {
    analyser.getByteFrequencyData(data);
    const { width, height } = els.level;
    ctx.clearRect(0, 0, width, height);
    const bar = width / data.length;
    ctx.fillStyle = state.paused ? "#bbb" : accent;
    data.forEach((v, i) => {
      const h = (v / 255) * height;
      ctx.fillRect(i * bar, height - h, bar - 1, h);
    });
    state.levelFrame = requestAnimationFrame(draw);
  };
  draw();
}

function stopLevelMeter() {
  cancelAnimationFrame(state.levelFrame);
  state.audioCtx?.close();
  state.audioCtx = null;
  els.level.getContext("2d").clearRect(0, 0, els.level.width, els.level.height);
}

// ---------- サーバー通信 ----------
async function api(path, init = {}) {
  const passcode = load(STORAGE.passcode, "");
  if (!passcode) {
    alert("設定で「合言葉」を入力してください。");
    openSettings();
    throw new Error("合言葉が未設定です");
  }
  const res = await fetch(path, {
    ...init,
    headers: { "X-App-Passcode": passcode, ...init.headers },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `サーバーエラー（${res.status}）`);
  }
  return res;
}

// ---------- 高精度文字起こし（話者識別） ----------
async function refineTranscript() {
  if (!state.audioBlob) {
    alert("録音データがありません。高精度文字起こしは録音直後のみ使えます。");
    return;
  }
  els.refine.disabled = true;
  els.refine.textContent = "高精度で文字起こし中…";
  setStatus("録音データを送信中…");
  try {
    const lang = els.lang.value.split("-")[0];
    const res = await api(`/api/transcripts?lang=${encodeURIComponent(lang)}`, {
      method: "POST",
      headers: { "Content-Type": state.audioBlob.type || "application/octet-stream" },
      body: state.audioBlob,
    });
    const { id } = await res.json();
    setStatus("高精度文字起こし中（会議の長さの1〜3割ほどかかります）…");

    let result;
    for (;;) {
      await new Promise((r) => setTimeout(r, 4000));
      result = await (await api(`/api/transcripts/${id}`)).json();
      if (result.status === "completed") break;
      if (result.status === "error") throw new Error(result.error);
    }

    if (!result.utterances.length) {
      setStatus("音声から発言を検出できませんでした");
      return;
    }
    state.entries = result.utterances.map((u) => ({
      t: u.start,
      speaker: `話者${u.speaker}`,
      text: u.text,
    }));
    renderTranscript();
    renderSpeakerNames();
    saveDraft();
    setStatus("高精度文字起こしが完了しました");
  } catch (err) {
    setStatus(`高精度文字起こしに失敗：${err.message}`);
  } finally {
    els.refine.disabled = !state.audioBlob;
    els.refine.textContent = "高精度で文字起こし（話者識別）";
  }
}

// 「話者A」などを実名に置き換える
function renderSpeakerNames() {
  const speakers = [...new Set(state.entries.map((e) => e.speaker).filter(Boolean))];
  els.speakerNames.innerHTML = "";
  els.speakerNames.hidden = !speakers.length;
  speakers.forEach((name) => {
    const label = document.createElement("label");
    label.textContent = name;
    const input = document.createElement("input");
    input.type = "text";
    input.value = name;
    input.addEventListener("change", () => {
      const next = input.value.trim();
      if (!next || next === name) return;
      state.entries.forEach((e) => {
        if (e.speaker === name) e.speaker = next;
      });
      rememberSpeaker(next);
      renderTranscript();
      renderSpeakerNames();
      saveDraft();
    });
    label.appendChild(input);
    els.speakerNames.appendChild(label);
  });
}

// ---------- AI議事録 ----------
async function summarize() {
  if (!state.entries.length) {
    alert("文字起こしがまだありません。");
    return;
  }

  els.summarize.disabled = true;
  els.summarize.textContent = "作成中…";
  els.summary.innerHTML = '<p class="placeholder">AIが議事録を作成しています…</p>';
  state.summaryMarkdown = "";

  try {
    const res = await api("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: meetingTitle(),
        date: new Date().toLocaleDateString("ja-JP"),
        transcript: transcriptText(),
      }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      state.summaryMarkdown += decoder.decode(value, { stream: true });
      els.summary.innerHTML = renderMarkdown(state.summaryMarkdown);
    }
    state.summaryMarkdown += decoder.decode();
    els.summary.innerHTML = renderMarkdown(state.summaryMarkdown);
    saveDraft();
  } catch (err) {
    els.summary.innerHTML = `<p class="error">議事録の作成に失敗しました：${escapeHtml(err.message)}</p>`;
  } finally {
    els.summarize.disabled = false;
    els.summarize.textContent = "AIで議事録を作成";
  }
}

// 議事録表示用の簡易Markdownレンダラー（見出し・箇条書き・チェックボックス・太字）
function renderMarkdown(md) {
  const lines = escapeHtml(md).split("\n");
  let html = "";
  let inList = false;
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const item = line.match(/^\s*[-*]\s+(\[( |x)\]\s+)?(.*)$/);
    if (item) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      const box = item[1] ? `<input type="checkbox" disabled${item[2] === "x" ? " checked" : ""}> ` : "";
      html += `<li>${box}${inline(item[3])}</li>`;
      continue;
    }
    if (inList) {
      html += "</ul>";
      inList = false;
    }
    if (heading) html += `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
    else if (line.trim()) html += `<p>${inline(line)}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}

// ---------- 書き出し ----------
function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildMarkdown() {
  const date = new Date().toLocaleString("ja-JP");
  let md = `# ${meetingTitle()}\n\n- 日時：${date}\n- 録音時間：${formatTime(state.elapsedBefore)}\n\n`;
  if (state.summaryMarkdown) md += `${state.summaryMarkdown}\n\n---\n\n`;
  md += `## 文字起こし全文\n\n`;
  md += state.entries
    .map((e) => `- \`${formatTime(e.t)}\`${e.speaker ? ` **${e.speaker}**:` : ""} ${e.text}`)
    .join("\n");
  return md + "\n";
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus("クリップボードにコピーしました");
  } catch {
    setStatus("コピーできませんでした");
  }
}

// ---------- 履歴 ----------
function renderHistory() {
  const items = load(STORAGE.history, []);
  els.history.innerHTML = items.length ? "" : '<li class="date">保存済みの会議はありません</li>';
  items.forEach((item, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="title"></span><span class="date"></span>
      <span class="actions">
        <button class="ghost small" data-act="open">開く</button>
        <button class="ghost small" data-act="delete">削除</button>
      </span>`;
    li.querySelector(".title").textContent = item.title;
    li.querySelector(".date").textContent = `${new Date(item.savedAt).toLocaleString("ja-JP")}・${item.entries.length}発言`;
    li.querySelector('[data-act="open"]').onclick = () => openMeeting(item);
    li.querySelector('[data-act="delete"]').onclick = () => {
      if (!confirm(`「${item.title}」を削除しますか？`)) return;
      items.splice(idx, 1);
      save(STORAGE.history, items);
      renderHistory();
    };
    els.history.appendChild(li);
  });
}

function saveMeeting() {
  if (!state.entries.length) {
    alert("保存する文字起こしがありません。");
    return;
  }
  const items = load(STORAGE.history, []);
  items.unshift({
    title: meetingTitle(),
    savedAt: Date.now(),
    duration: state.elapsedBefore,
    entries: state.entries,
    summary: state.summaryMarkdown,
  });
  save(STORAGE.history, items);
  renderHistory();
  setStatus("会議を保存しました");
}

function openMeeting(item) {
  if (state.recording) {
    alert("録音中は開けません。先に録音を終了してください。");
    return;
  }
  els.title.value = item.title;
  state.entries = item.entries.map((e) => ({ ...e }));
  state.summaryMarkdown = item.summary || "";
  state.elapsedBefore = item.duration || 0;
  els.timer.textContent = formatTime(state.elapsedBefore);
  state.audioBlob = null;
  els.refine.disabled = true;
  renderTranscript();
  renderSpeakerNames();
  els.summary.innerHTML = state.summaryMarkdown
    ? renderMarkdown(state.summaryMarkdown)
    : '<p class="placeholder">議事録はまだ作成されていません。</p>';
  saveDraft();
}

// ---------- 設定 ----------
function openSettings() {
  els.passcode.value = load(STORAGE.passcode, "");
  els.settingsDialog.showModal();
}

els.settingsDialog.addEventListener("close", () => {
  if (els.settingsDialog.returnValue !== "save") return;
  save(STORAGE.passcode, els.passcode.value.trim());
  save(STORAGE.lang, els.lang.value);
  save(STORAGE.saveAudio, els.saveAudio.checked);
});

// ---------- 初期化 ----------
function init() {
  if (!SpeechRecognition) {
    $("supportWarning").hidden = false;
    els.start.disabled = true;
  }

  els.lang.value = load(STORAGE.lang, "ja-JP");
  els.saveAudio.checked = load(STORAGE.saveAudio, true);

  const draft = load(STORAGE.draft, null);
  if (draft) {
    els.title.value = draft.title || "";
    state.entries = draft.entries || [];
    state.summaryMarkdown = draft.summary || "";
    renderTranscript();
    if (state.summaryMarkdown) els.summary.innerHTML = renderMarkdown(state.summaryMarkdown);
  }
  state.entries.forEach((e) => e.speaker && rememberSpeaker(e.speaker));
  renderSpeakerNames();

  els.start.onclick = startRecording;
  els.pause.onclick = togglePause;
  els.stop.onclick = stopRecording;
  els.summarize.onclick = summarize;
  els.refine.onclick = refineTranscript;
  $("settingsButton").onclick = openSettings;
  $("saveButton").onclick = saveMeeting;
  $("exportMdButton").onclick = () => download(`${meetingTitle()}.md`, buildMarkdown(), "text/markdown");
  $("exportTxtButton").onclick = () => download(`${meetingTitle()}.txt`, transcriptText(), "text/plain");
  $("copyTranscriptButton").onclick = () => copy(transcriptText());
  $("copySummaryButton").onclick = () => copy(state.summaryMarkdown);
  $("clearButton").onclick = () => {
    if (state.recording) return;
    if (state.entries.length && !confirm("文字起こしと議事録をクリアしますか？（保存済みの会議は消えません）")) return;
    state.entries = [];
    state.summaryMarkdown = "";
    state.elapsedBefore = 0;
    els.timer.textContent = formatTime(0);
    renderTranscript();
    renderSpeakerNames();
    els.summary.innerHTML = '<p class="placeholder">文字起こしが終わったら「AIで議事録を作成」を押すと、要約・決定事項・ToDoを自動でまとめます。</p>';
    saveDraft();
  };
  els.title.addEventListener("input", saveDraft);

  window.addEventListener("beforeunload", (e) => {
    if (state.recording) e.preventDefault();
  });

  renderHistory();
}

init();
