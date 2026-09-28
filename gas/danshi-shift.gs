/**
 * 男子シフト 自動作成 + LINE連携（Google Apps Script）
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

// トリガー用: 今日から見て翌月のシートがなければ作る
function autoCreateNextMonth() {
  const [y, m] = Utilities.formatDate(new Date(), TZ, 'yyyy,M').split(',').map(Number);
  const [ny, nm] = addMonth_(y, m);
  createMonthSheet_(ny, nm);
}

function createMonthSheet_(y, m) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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

// ---------- LINE ----------

function setupLine() {
  const ui = SpreadsheetApp.getUi();
  const t = ui.prompt('LINE設定 (1/2)',
    'LINE公式アカウントの「チャネルアクセストークン（長期）」を貼り付けてください', ui.ButtonSet.OK_CANCEL);
  if (t.getSelectedButton() !== ui.Button.OK) return;
  const to = ui.prompt('LINE設定 (2/2)',
    '送信先のユーザーID/グループID（U… / C…）。空欄なら友だち全員に一斉送信', ui.ButtonSet.OK_CANCEL);
  const p = PropertiesService.getScriptProperties();
  p.setProperty('LINE_TOKEN', t.getResponseText().trim());
  p.setProperty('LINE_TO', to.getSelectedButton() === ui.Button.OK ? to.getResponseText().trim() : '');
  notify_('男子シフト表とLINEの連携テストです。');
  ui.alert('設定しました。LINEにテストメッセージが届いたか確認してください。');
}

function sendTomorrowShift() {
  const [y, m, d, u] = Utilities.formatDate(new Date(Date.now() + 86400000), TZ, 'yyyy,M,d,u')
    .split(',').map(Number);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(y + '.' + m);
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
  ScriptApp.newTrigger('autoCreateNextMonth').timeBased().onMonthDay(20).atHour(9).inTimezone(TZ).create();
  ScriptApp.newTrigger('sendTomorrowShift').timeBased().everyDays(1).atHour(20).inTimezone(TZ).create();
  SpreadsheetApp.getUi().alert('自動実行を設定しました。\n' +
    '・毎月20日 9時台: 翌月のシートを作成してLINEに通知\n' +
    '・毎日20時台: 明日のシフトをLINEに送信');
}

// ---------- helpers ----------

function monthSheets_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets().map(s => {
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
