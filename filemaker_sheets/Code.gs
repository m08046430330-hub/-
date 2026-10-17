/**
 * FileMaker「女性台帳」→ Google スプレッドシート 連動用 Apps Script
 *
 * FileMaker の「URL から挿入」で JSON を POST すると、指定シートを丸ごと書き換える。
 * 受け取る JSON:
 *   { "token": "...", "sheet": "女性台帳", "header": ["女性ID", ...], "rows": [[...], ...] }
 */

// FileMaker 側と同じ合言葉にする（推測されにくい長い文字列に変えること）
const TOKEN = 'ここを長いランダム文字列に変更';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.token !== TOKEN) return reply_({ ok: false, error: 'token mismatch' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const name = data.sheet || '女性台帳';
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    const header = data.header || [];
    const rows = data.rows || [];
    const width = Math.max(header.length, ...rows.map(r => r.length), 1);
    const pad = r => r.concat(Array(width - r.length).fill(''));

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      sheet.clearContents();
      const values = [pad(header)].concat(rows.map(pad));
      // 先頭0や日付が勝手に変換されないよう文字列として書く
      sheet.getRange(1, 1, values.length, width).setNumberFormat('@').setValues(values);
      sheet.setFrozenRows(1);
      sheet.getRange(1, width + 2).setValue('最終更新: ' +
        Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'));
    } finally {
      lock.releaseLock();
    }
    return reply_({ ok: true, rows: rows.length });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  }
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
