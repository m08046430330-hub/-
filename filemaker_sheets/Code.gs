/**
 * FileMaker で書き出した Excel/CSV を「女性台帳試作品」シートに自動で取り込む。
 * Google ドライブの「FileMaker書き出し」フォルダを5分ごとに確認し、新しいファイルがあれば反映する。
 * 準備：エディタ左の「サービス」で Drive API を追加 → setup を1回実行。
 */

const FOLDER_ID = '1aL4aBjF6PlcI4pGr4Zg9YYr1Ac6ox7td';
const SHEET_NAME = '女性台帳';

// シートの見出し → FileMaker 側で使われている可能性のある見出し
const ALIASES = {
  '女性ID': ['女性ID', 'ID'],
  '在籍女性No': ['在籍女性No'],
  '女性No': ['女性No'],
  '在籍': ['在籍'],
  '売上管理表に表示': ['売上管理表に表示'],
  '当日出勤': ['当日出勤'],
  '姓': ['姓', 'Cast名字'],
  '名': ['名', 'Cast名'],
  '姓（カナ）': ['姓（カナ）', '姓(カナ)', 'Cast名字_カナ'],
  '名（カナ）': ['名（カナ）', '名(カナ)', 'Cast名_カナ'],
  '分類': ['分類'],
  '担当者': ['担当者'],
  '本名': ['本名'],
  '本名（カナ）': ['本名（カナ）', '本名(カナ)', '本名_カナ'],
  '生年月日': ['生年月日', 'D_生年月日'],
  '入店日付': ['入店日付', '入店日'],
  '備考': ['備考'],
  '退店日付': ['退店日付', '退店日'],
  'メールアドレス': ['メールアドレス', 'メール'],
};
const CHECKBOX_COLUMNS = ['売上管理表に表示', '当日出勤'];

function setup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'importLatest')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('importLatest').timeBased().everyMinutes(5).create();
  importLatest(true);
}

function importLatest(force) {
  const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
  let latest = null;
  while (files.hasNext()) {
    const f = files.next();
    if (!/\.(xlsx|csv)$/i.test(f.getName())) continue;
    if (!latest || f.getLastUpdated() > latest.getLastUpdated()) latest = f;
  }
  if (!latest) return;

  const props = PropertiesService.getScriptProperties();
  const stamp = latest.getId() + '@' + latest.getLastUpdated().getTime();
  if (force !== true && props.getProperty('lastImported') === stamp) return;

  const src = (/\.xlsx$/i.test(latest.getName()) ? readXlsx_(latest) : readCsv_(latest))
    .filter(r => r.some(v => String(v).trim() !== ''));
  if (src.length < 2) return;
  const srcHeader = src[0].map(h => String(h).trim());
  const body = src.slice(1);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const header = firstRow.slice(0, firstRow.indexOf('') < 0 ? firstRow.length : firstRow.indexOf(''));  // 右の「最終更新」は含めない
  const srcIndex = header.map(h => (ALIASES[h] || [h]).map(a => srcHeader.indexOf(a)).find(i => i >= 0));

  const rows = body.map((r, n) => header.map((h, c) => {
    const i = srcIndex[c];
    let v = i === undefined ? '' : r[i];
    if (h === '女性ID' && v === '') v = n + 1;
    if (CHECKBOX_COLUMNS.indexOf(h) >= 0) v = /^(1|true|yes|○|✓|☑)$/i.test(String(v).trim());
    return v;
  }));

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const last = sheet.getLastRow();
    if (last > 1) sheet.getRange(2, 1, last - 1, header.length).clearContent();
    sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
    sheet.getRange(1, header.length + 2).setValue('最終更新: ' +
      Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '（' + latest.getName() + '）');
  } finally {
    lock.releaseLock();
  }
  props.setProperty('lastImported', stamp);
}

function readCsv_(file) {
  const blob = file.getBlob();
  let text = blob.getDataAsString('UTF-8');
  if (text.indexOf('�') !== -1) text = blob.getDataAsString('Shift_JIS');  // Windows の書き出しは Shift_JIS のことが多い
  text = text.replace(/^﻿/, '').replace(/\u000B/g, '\n');  // FileMaker はセル内改行を VT で出す
  return Utilities.parseCsv(text);
}

// xlsx を一時的にスプレッドシートへ変換して表示どおりの値を読み、一時ファイルは削除する
function readXlsx_(file) {
  const tmp = Drive.Files.create({ name: 'tmp_' + file.getName(), mimeType: MimeType.GOOGLE_SHEETS }, file.getBlob());
  try {
    return SpreadsheetApp.openById(tmp.id).getSheets()[0].getDataRange().getDisplayValues();
  } finally {
    DriveApp.getFileById(tmp.id).setTrashed(true);
  }
}
