/**
 * 男子シフト 自動作成 + LINE連携（LINEからのシフト入力・通知）（Google Apps Script）
 *
 * 使い方: スプレッドシート「男子シフト」→ 拡張機能 → Apps Script に貼り付けて保存。
 * シート名は「2026.10」のように「年.月」の形式にしておくこと。
 */
const TZ = 'Asia/Tokyo';
const WD = ['日', '月', '火', '水', '木', '金', '土'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('シフト')
    .addItem('翌月のシートを作成', 'createNextMonthSheet')
    .addItem('明日のシフトをLINEに送信', 'sendTomorrowShift')
    .addSeparator()
    .addItem('スタッフを追加', 'addStaff')
    .addItem('LINE設定', 'setupLine')
    .addItem('自動実行を設定', 'setupTriggers')
    .addToUi();
}

// ---------- シート作成 ----------

// メニュー用: いちばん新しい月の次の月を作る
function createNextMonthSheet() {
  const list = monthSheets_();
  if (!list.length) throw new Error('「2026.10」のような名前のシートが見つかりません');
  const latest = list[list.length - 1];
  const [y, m] = addMonth_(latest.y, latest.m);
  createMonthSheet_(y, m);
}

// トリガー用（毎日実行）: 翌月1日の1週間前になったら翌月のシートを作る
const DAYS_BEFORE = 7;
function autoCreateNextMonth() {
  const [y, m, d] = Utilities.formatDate(new Date(), TZ, 'yyyy,M,d').split(',').map(Number);
  const daysLeft = new Date(y, m, 0).getDate() - d + 1; // 翌月1日までの日数
  if (daysLeft > DAYS_BEFORE) return;
  const [ny, nm] = addMonth_(y, m);
  createMonthSheet_(ny, nm);
}

function createMonthSheet_(y, m) {
  const ss = ss_();
  const name = y + '.' + m;
  if (ss.getSheetByName(name)) return;
  const prev = monthSheets_().filter(s => s.y * 12 + s.m < y * 12 + m).pop();
  const staff = prev ? readStaff_(prev.sheet).map(s => [s.name, s.wage]) : [];
  const sh = ss.insertSheet(name, 0);
  buildSheet_(sh, y, m, staff);
  notify_(`${y}年${m}月の男子シフト表を作成しました。\n${ss.getUrl()}#gid=${sh.getSheetId()}`);
}

function buildSheet_(sh, y, m, staff) {
  const nd = new Date(y, m, 0).getDate();
  const first = 3, last = first + nd - 1, tot = last + 1;
  const n = staff.length;
  const totalRow = 4 + n;

  sh.getRange(1, 1, 1, tot).merge()
    .setValue(`男子シフト　${y}年${m}月`).setFontSize(14).setFontWeight('bold');
  sh.setRowHeight(1, 30);

  const h1 = ['名前', '時給'], h2 = ['', ''];
  for (let d = 1; d <= nd; d++) {
    h1.push(d);
    h2.push(WD[new Date(y, m - 1, d).getDay()]);
  }
  h1.push('出勤日数'); h2.push('');
  sh.getRange(2, 1, 2, tot).setValues([h1, h2])
    .setBackground('#1F3864').setFontColor('#FFFFFF').setFontWeight('bold');
  [1, 2, tot].forEach(c => sh.getRange(2, c, 2, 1).merge());

  if (n) {
    const body = staff.map((s, i) => {
      const r = 4 + i;
      const row = [s[0], s[1]];
      for (let d = 0; d < nd; d++) row.push('');
      row.push(`=COUNTA(${col_(first)}${r}:${col_(last)}${r})`);
      return row;
    });
    sh.getRange(4, 1, n, tot).setValues(body);
    sh.getRange(4, 1, n, 1).setFontWeight('bold').setHorizontalAlignment('left');
    sh.getRange(4, 2, n, 1).setNumberFormat('"¥"#,##0');
    sh.getRange(4, tot, n, 1).setFontWeight('bold');
    for (let i = 1; i < n; i += 2) sh.getRange(4 + i, 1, 1, tot).setBackground('#F7F7F7');
    sh.setRowHeights(4, n, 24);
  }

  for (let d = 1; d <= nd; d++) {
    const w = new Date(y, m - 1, d).getDay(), c = first + d - 1;
    if (w === 6 || w === 0) {
      sh.getRange(2, c, 2, 1).setFontColor(w === 6 ? '#9DC3E6' : '#F4B6B6');
      if (n) sh.getRange(4, c, n, 1).setBackground(w === 6 ? '#DDEBF7' : '#FCE4E4');
    }
  }

  const tr = ['出勤人数', ''];
  for (let c = first; c <= last; c++) tr.push(`=COUNTA(${col_(c)}4:${col_(c)}${totalRow - 1})`);
  tr.push(`=SUM(${col_(first)}${totalRow}:${col_(last)}${totalRow})`);
  sh.getRange(totalRow, 1, 1, tot).setValues([tr])
    .setBackground('#FFF2CC').setFontWeight('bold');

  const all = sh.getRange(2, 1, totalRow - 1, tot);
  all.setBorder(true, true, true, true, true, true, '#999999', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(2, 2, totalRow - 1, tot - 1).setHorizontalAlignment('center');
  all.setVerticalAlignment('middle');
  sh.setColumnWidth(1, 110);
  sh.setColumnWidth(2, 70);
  sh.setColumnWidths(first, nd, 36);
  sh.setColumnWidth(tot, 70);
  sh.setFrozenRows(3);
  sh.setFrozenColumns(2);
}

// ---------- スタッフ追加 ----------

// 今月以降のすべての月のシートに、出勤人数の行の上へ1行追加する
function addStaff() {
  const ui = SpreadsheetApp.getUi();
  const n = ui.prompt('スタッフを追加 (1/2)', '名前（フルネーム）', ui.ButtonSet.OK_CANCEL);
  if (n.getSelectedButton() !== ui.Button.OK) return;
  const name = n.getResponseText().trim();
  if (!name) return;
  const w = ui.prompt('スタッフを追加 (2/2)', '時給（数字のみ。例: 1300）', ui.ButtonSet.OK_CANCEL);
  if (w.getSelectedButton() !== ui.Button.OK) return;
  const wage = Number(normalize_(w.getResponseText()).replace(/[^\d]/g, '')) || '';

  const [cy, cm] = Utilities.formatDate(new Date(), TZ, 'yyyy,M').split(',').map(Number);
  const targets = monthSheets_().filter(s => s.y * 12 + s.m >= cy * 12 + cm);
  const added = targets.filter(s => addStaffRow_(s.sheet, s.y, s.m, name, wage)).map(s => s.sheet.getName());
  ui.alert(added.length
    ? `${name}さんを追加しました（${added.join('、')}）。\nLINEで「登録 ${name}」を送ってもらえば入力できます。`
    : `${name}さんはすでに登録されています。`);
}

function addStaffRow_(sh, y, m, name, wage) {
  const clean = s => String(s).replace(/\s/g, '');
  if (readStaff_(sh).some(s => clean(s.name) === clean(name))) return false;
  const colA = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => r[0]);
  const totalRow = colA.indexOf('出勤人数') + 1;
  if (totalRow < 4) throw new Error(sh.getName() + ' に「出勤人数」の行が見つかりません');

  const nd = new Date(y, m, 0).getDate();
  const first = 3, last = first + nd - 1, tot = last + 1;
  sh.insertRowBefore(totalRow);
  const r = totalRow, newTotal = totalRow + 1;
  if (r - 1 >= 4) {
    sh.getRange(r - 1, 1, 1, tot).copyFormatToRange(sh, 1, tot, r, r);
    sh.getRange(r, first, 1, nd).setNumberFormat('General');
  }
  const row = [name, wage];
  for (let d = 0; d < nd; d++) row.push('');
  row.push(`=COUNTA(${col_(first)}${r}:${col_(last)}${r})`);
  sh.getRange(r, 1, 1, tot).setValues([row]);

  const tr = [];
  for (let c = first; c <= last; c++) tr.push(`=COUNTA(${col_(c)}4:${col_(c)}${newTotal - 1})`);
  sh.getRange(newTotal, first, 1, nd).setFormulas([tr]);
  return true;
}

// ---------- LINE ----------

function setupLine() {
  const ui = SpreadsheetApp.getUi();
  const t = ui.prompt('LINE設定 (1/2)',
    'LINE公式アカウントの「チャネルアクセストークン（長期）」を貼り付けてください', ui.ButtonSet.OK_CANCEL);
  if (t.getSelectedButton() !== ui.Button.OK) return;
  const to = ui.prompt('LINE設定 (2/2)',
    '送信先のユーザーID/グループID（U… / C…）。空欄なら友だち全員に一斉送信', ui.ButtonSet.OK_CANCEL);
  const p = PropertiesService.getScriptProperties();
  p.setProperty('SHEET_ID', SpreadsheetApp.getActiveSpreadsheet().getId());
  p.setProperty('LINE_TOKEN', t.getResponseText().trim());
  p.setProperty('LINE_TO', to.getSelectedButton() === ui.Button.OK ? to.getResponseText().trim() : '');
  notify_('男子シフト表とLINEの連携テストです。');
  ui.alert('設定しました。LINEにテストメッセージが届いたか確認してください。');
}

// メニューから手動で送るときだけ使う（毎晩の自動送信は廃止）
function sendTomorrowShift(e) {
  if (e && e.triggerUid) {
    // 以前に設定した毎晩のトリガーから呼ばれたら、そのトリガーを削除して何もしない
    ScriptApp.getProjectTriggers()
      .filter(t => t.getUniqueId() === e.triggerUid)
      .forEach(t => ScriptApp.deleteTrigger(t));
    return;
  }
  const [y, m, d, u] = Utilities.formatDate(new Date(Date.now() + 86400000), TZ, 'yyyy,M,d,u')
    .split(',').map(Number);
  const sh = ss_().getSheetByName(y + '.' + m);
  if (!sh) return;
  const lines = readStaff_(sh)
    .map(s => [s.name, sh.getRange(s.row, 2 + d).getDisplayValue()])
    .filter(([, v]) => v !== '')
    .map(([name, v]) => `・${name}　${v}`);
  notify_(`【明日 ${m}/${d}(${WD[u % 7]}) の男子シフト】\n` +
    (lines.length ? lines.join('\n') : '出勤予定なし'));
}

function notify_(text) {
  const p = PropertiesService.getScriptProperties();
  const token = p.getProperty('LINE_TOKEN');
  if (!token) return;
  const to = p.getProperty('LINE_TO');
  const payload = { messages: [{ type: 'text', text: text.slice(0, 5000) }] };
  if (to) payload.to = to;
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/' + (to ? 'push' : 'broadcast'), {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('LINE送信エラー: ' + res.getContentText());
}

// ---------- 自動実行 ----------

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoCreateNextMonth').timeBased().everyDays(1).atHour(9).inTimezone(TZ).create();
  SpreadsheetApp.getUi().alert('自動実行を設定しました。\n' +
    '・翌月1日の1週間前 9時台: 翌月のシートを作成してLINEに通知\n' +
    '（毎晩の「明日のシフト」通知は送りません）');
}

// ---------- LINEからの入力（Webhook） ----------
//
// 送信例:
//   登録 井ノ上真斗      … 最初に1回。自分のLINEと名前を結びつける
//   10/5 16:00           … 10月5日の欄に「16:00」と入力
//   10/5 16:00           （複数行まとめて送ってもOK）
//   10/6 休              … 10月6日の欄を空にする（休・×・削除 でも可）
//   確認                 … 今月と来月の自分のシフトを返信
//   テンプレ             … 来月分の提出用ひな形を返信（「テンプレ 10」で10月分）
//   週テンプレ           … 来週（月〜日）の1週間分のひな形（「今週テンプレ」で今週分）

const CLEAR_WORDS = ['休', '休み', '×', 'x', 'X', '削除', '消去', 'なし'];
const HELP_TEXT = [
  '【シフト入力の使い方】',
  '最初に1回: 登録 フルネーム（例: 登録 井ノ上真斗）',
  '　※シフト表にない名前は自動で追加されます',
  '入力: 10/5 16:00（1行に1日。複数行OK）',
  '取消: 10/5 休',
  '確認: 確認',
  'ひな形: テンプレ（来月分）／テンプレ 10（10月分）',
  '1週間: 週テンプレ（来週分）／今週テンプレ（今週分）',
].join('\n');

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  (body.events || []).forEach(ev => {
    if (ev.type !== 'message' || ev.message.type !== 'text' || !ev.source.userId) return;
    let reply;
    try {
      reply = handleText_(ev.source.userId, ev.message.text);
    } catch (err) {
      reply = 'エラー: ' + err.message;
    }
    if (reply) replyLine_(ev.replyToken, reply);
  });
  return ContentService.createTextOutput('OK');
}

function handleText_(userId, text) {
  const t = normalize_(text).trim();
  const props = PropertiesService.getScriptProperties();
  const key = 'USER_' + userId;

  const reg = t.match(/^登録\s*(.+)$/);
  if (reg) {
    const name = reg[1].replace(/\s/g, '');
    if (name.length > 20) return '名前は20文字以内で送ってください。';
    // 同じ名前を別のLINEがすでに使っていないか
    const all = props.getProperties();
    const owner = Object.keys(all).find(k => k.indexOf('USER_') === 0 && all[k] === name && k !== key);
    if (owner) return `「${name}」はすでに別のLINEで登録されています。管理者に確認してください。`;

    // シフト表にいなければ、今月以降の各月のシートに行を追加する（時給は管理者があとで入力）
    const [cy, cm] = Utilities.formatDate(new Date(), TZ, 'yyyy,M').split(',').map(Number);
    let added = false;
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      monthSheets_().filter(s => s.y * 12 + s.m >= cy * 12 + cm).forEach(s => {
        if (addStaffRow_(s.sheet, s.y, s.m, name, '')) added = true;
      });
    } finally {
      lock.releaseLock();
    }
    props.setProperty(key, name);
    return `${name}さんとして登録しました。` + (added ? '（シフト表に追加しました）' : '') + '\n\n' + HELP_TEXT;
  }

  const name = props.getProperty(key);
  if (!name) return 'はじめに「登録 名前」を送ってください。\n\n' + HELP_TEXT;
  if (/^(確認|シフト)$/.test(t)) return myShift_(name);
  if (/^(ヘルプ|使い方|help)$/i.test(t)) return HELP_TEXT;
  const wk = t.match(/^(週|今週|来週)(テンプレ|テンプレート|ひな形|雛形|雛型)?$/) ||
    t.match(/^(?:テンプレ|テンプレート|ひな形|雛形|雛型)\s*(週|今週|来週)$/);
  if (wk) return weekTemplate_(name, wk[1] === '今週' ? 0 : 1);
  const tpl = t.match(/^(テンプレ|テンプレート|ひな形|雛形|雛型)\s*(\d{1,2})?月?(分)?$/);
  if (tpl) return template_(name, tpl[2] ? +tpl[2] : null);

  const results = [];
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    t.split('\n').map(s => s.trim()).filter(Boolean).forEach(line => {
      const r = writeLine_(name, line);
      if (r) results.push(r);
    });
  } finally {
    lock.releaseLock();
  }
  if (!results.length) return '入力がありませんでした。出勤する日の後ろに時間を書いて送ってください。';
  return `${name}さん\n` + results.join('\n');
}

// 提出用のひな形。日付と曜日だけ入っていて、時間を書き足して送り返す
function template_(name, month) {
  const [cy, cm] = Utilities.formatDate(new Date(), TZ, 'yyyy,M').split(',').map(Number);
  let y, m;
  if (month) {
    if (month < 1 || month > 12) return '月は1〜12で指定してください（例: テンプレ 11）';
    m = month;
    y = (cm - m > 6) ? cy + 1 : (m - cm > 6 ? cy - 1 : cy);
  } else {
    [y, m] = addMonth_(cy, cm);
  }
  const days = [];
  for (let d = 1; d <= new Date(y, m, 0).getDate(); d++) days.push(new Date(y, m - 1, d));
  return templateMessages_(name, `${m}月`, days);
}

// 1週間（月〜日）のひな形。weeksAhead: 0=今週, 1=来週
function weekTemplate_(name, weeksAhead) {
  const [y, m, d, u] = Utilities.formatDate(new Date(), TZ, 'yyyy,M,d,u').split(',').map(Number);
  const monday = new Date(y, m - 1, d - (u - 1) + 7 * weeksAhead);
  const days = [];
  for (let i = 0; i < 7; i++) days.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  const label = `${weeksAhead ? '来週' : '今週'} ${fmtDay_(days[0])}〜${fmtDay_(days[6])}`;
  return templateMessages_(name, label, days);
}

function templateMessages_(name, label, days) {
  const lines = [`【シフト提出 ${label}】${name}`].concat(days.map(dt => fmtDay_(dt) + ' '));
  return [
    `${label}のひな形です。\n次のメッセージを長押し→コピーして、出勤する日の後ろに時間を書いて送ってください。\n` +
      '・何も書かない日は変更されません\n・休みにする日は「休」\n例: ' + fmtDay_(days[0]) + ' 16:00',
    lines.join('\n'),
  ];
}

function fmtDay_(dt) {
  return `${dt.getMonth() + 1}/${dt.getDate()}(${WD[dt.getDay()]})`;
}

function writeLine_(name, line) {
  if (/^[【―]/.test(line)) return null; // ひな形の見出し行
  const mt = line.match(/^(\d{1,2})[\/月](\d{1,2})日?\s*(?:[(（][^)）]*[)）])?\s*(.*)$/);
  if (!mt) return `✕「${line}」形式が違います（例: 10/5 16:00）`;
  const m = +mt[1], d = +mt[2], value = mt[3].trim();
  if (!value) return null; // ひな形の空欄の日は変更しない

  const [cy, cm] = Utilities.formatDate(new Date(), TZ, 'yyyy,M').split(',').map(Number);
  const y = (cm - m > 6) ? cy + 1 : (m - cm > 6 ? cy - 1 : cy);
  const sh = ss_().getSheetByName(y + '.' + m);
  if (!sh) return `✕ ${m}月のシートがまだありません`;
  if (d < 1 || d > new Date(y, m, 0).getDate()) return `✕ ${m}/${d} は存在しない日付です`;

  const me = readStaff_(sh).find(s => String(s.name).replace(/\s/g, '') === name);
  if (!me) return `✕ ${m}月のシートに${name}さんの行がありません`;

  const cell = sh.getRange(me.row, 2 + d);
  const w = WD[new Date(y, m - 1, d).getDay()];
  if (CLEAR_WORDS.indexOf(value) >= 0) {
    cell.clearContent();
    return `○ ${m}/${d}(${w}) 休み`;
  }
  cell.setNumberFormat('@').setValue(value);
  return `○ ${m}/${d}(${w}) ${value}`;
}

function myShift_(name) {
  const [cy, cm] = Utilities.formatDate(new Date(), TZ, 'yyyy,M').split(',').map(Number);
  const out = [`【${name}さんのシフト】`];
  [[cy, cm], addMonth_(cy, cm)].forEach(([y, m]) => {
    const sh = ss_().getSheetByName(y + '.' + m);
    if (!sh) return;
    const me = readStaff_(sh).find(s => String(s.name).replace(/\s/g, '') === name);
    if (!me) return;
    const nd = new Date(y, m, 0).getDate();
    const vals = sh.getRange(me.row, 3, 1, nd).getDisplayValues()[0];
    const days = vals.map((v, i) => v ? `${m}/${i + 1}(${WD[new Date(y, m - 1, i + 1).getDay()]}) ${v}` : null)
      .filter(Boolean);
    out.push(`― ${m}月 ―`, days.length ? days.join('\n') : '入力なし');
  });
  return out.join('\n');
}

// 返信の下に「テンプレ」「確認」ボタン（クイックリプライ）を付ける
function replyLine_(replyToken, texts) {
  const token = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  if (!token) return;
  const messages = [].concat(texts).slice(0, 5).map(text => ({ type: 'text', text: text.slice(0, 5000) }));
  messages[messages.length - 1].quickReply = {
    items: ['週テンプレ', 'テンプレ', '確認', '使い方'].map(label => ({
      type: 'action', action: { type: 'message', label, text: label },
    })),
  };
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ replyToken, messages }),
    muteHttpExceptions: true,
  });
}

// 全角数字・記号を半角にそろえる
function normalize_(s) {
  return s.replace(/[０-９：／]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ').replace(/\r/g, '');
}

// ---------- helpers ----------

// Webhook（doPost）から呼ばれたときも同じスプレッドシートを開けるようにする
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function monthSheets_() {
  return ss_().getSheets().map(s => {
    const mt = s.getName().match(/^(\d{4})\.(\d{1,2})$/);
    return mt ? { sheet: s, y: +mt[1], m: +mt[2] } : null;
  }).filter(Boolean).sort((a, b) => (a.y * 12 + a.m) - (b.y * 12 + b.m));
}

// 4行目から「出勤人数」の行の手前までを名前・時給として読む
function readStaff_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return [];
  const vals = sheet.getRange(4, 1, lastRow - 3, 2).getValues();
  const out = [];
  for (let i = 0; i < vals.length; i++) {
    const [name, wage] = vals[i];
    if (name === '出勤人数') break;
    if (name !== '') out.push({ name, wage, row: 4 + i });
  }
  return out;
}

function addMonth_(y, m) {
  return m === 12 ? [y + 1, 1] : [y, m + 1];
}

function col_(c) {
  let s = '';
  while (c > 0) {
    const r = (c - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    c = Math.floor((c - 1) / 26);
  }
  return s;
}
