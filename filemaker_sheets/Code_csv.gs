/**
 * FileMaker から書き出した CSV を、Google ドライブ経由でスプレッドシートに自動取り込みする。
 * フォルダ「FileMaker書き出し」に新しい CSV が置かれる（上書きされる）と、5分以内に「女性台帳」シートへ反映。
 * 最初に1回だけ setup を実行すること。
 * xlsx も取り込める（エディタ左の「サービス」で Drive API を追加しておくこと）。
 */

const FOLDER_ID = '1OGTfV13uzymU7O7SIiwUWAdiwfX75lZ7';  // ドライブの「FileMaker書き出し」フォルダ
const SHEET_NAME = '女性台帳';
// CSV に見出し行がないとき、ここに列名を並べると1行目に入る（空なら CSV をそのまま書く）
const HEADER = [];

function setup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'importLatestCsv')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('importLatestCsv').timeBased().everyMinutes(5).create();
  importLatestCsv(true);
}

function importLatestCsv(force) {
  const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
  let latest = null;
  while (files.hasNext()) {
    const f = files.next();
    if (!/\.(csv|tab|txt|xlsx)$/i.test(f.getName())) continue;
    if (!latest || f.getLastUpdated() > latest.getLastUpdated()) latest = f;
  }
  if (!latest) return;

  const props = PropertiesService.getScriptProperties();
  const stamp = latest.getId() + '@' + latest.getLastUpdated().getTime();
  if (force !== true && props.getProperty('lastImported') === stamp) return;

  let rows = /\.xlsx$/i.test(latest.getName()) ? readXlsx_(latest) : readCsv_(latest);
  rows = rows.filter(r => r.some(v => v !== ''));
  if (HEADER.length) rows = [HEADER].concat(rows);
  if (!rows.length) return;
  const width = Math.max(...rows.map(r => r.length));
  rows = rows.map(r => r.concat(Array(width - r.length).fill('')));

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, width).setNumberFormat('@').setValues(rows);
  sheet.setFrozenRows(1);
  sheet.getRange(1, width + 2).setValue('最終更新: ' +
    Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '（' + latest.getName() + '）');

  props.setProperty('lastImported', stamp);
}

function readCsv_(file) {
  const blob = file.getBlob();
  let text = blob.getDataAsString('UTF-8');
  if (text.indexOf('\uFFFD') !== -1) text = blob.getDataAsString('Shift_JIS');  // Windows の書き出しは Shift_JIS のことが多い
  text = text.replace(/^\uFEFF/, '').replace(/\u000B/g, '\n');  // FileMaker はセル内改行を VT で出す
  const delimiter = /\.tab$/i.test(file.getName()) ? '\t' : ',';
  return Utilities.parseCsv(text, delimiter);
}

// xlsx を一時的にスプレッドシートへ変換して値を読み、一時ファイルは削除する
function readXlsx_(file) {
  const tmp = Drive.Files.create({ name: 'tmp_' + file.getName(), mimeType: MimeType.GOOGLE_SHEETS }, file.getBlob());
  try {
    return SpreadsheetApp.openById(tmp.id).getSheets()[0].getDataRange().getDisplayValues();
  } finally {
    DriveApp.getFileById(tmp.id).setTrashed(true);
  }
}
