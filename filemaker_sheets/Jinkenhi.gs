/**
 * FileMaker で「人件費」という名前で書き出したファイルの人件費を合計し、
 * 売上管理表のその日の「女子給」に入れる（女性台帳の取り込みとは別のプロジェクト）。
 * 準備：エディタ左の「サービス」で Drive API を追加 → setup を1回実行。
 */

const FOLDER_ID = '1aL4aBjF6PlcI4pGr4Zg9YYr1Ac6ox7td';  // ドライブの「FileMaker書き出し」フォルダ
const FILE_NAME = '人件費.xlsx';
const SALES_SHEET_ID = '1UgBqm6epbf8pbF85gh3oK2C9oM4Q6MC8S3nRmpepaMo';  // いまは試作のコピー

function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('importJinkenhi').timeBased().everyMinutes(5).create();
  importJinkenhi(true);
}

function importJinkenhi(force) {
  let file = null;
  const files = DriveApp.getFolderById(FOLDER_ID).getFilesByName(FILE_NAME);
  while (files.hasNext()) {
    const f = files.next();
    if (!file || f.getLastUpdated() > file.getLastUpdated()) file = f;
  }
  if (!file) return;

  const props = PropertiesService.getScriptProperties();
  const stamp = file.getId() + '@' + file.getLastUpdated().getTime();
  if (force !== true && props.getProperty('lastImported') === stamp) return;

  const src = readXlsx_(file);
  const header = src[0].map(h => String(h).trim());
  // 「人件費(残り)」ではなく「人件費」の列を合計する
  let col = header.indexOf('人件費');
  if (col < 0) col = header.findIndex(h => h.indexOf('人件費') >= 0 && h.indexOf('残') < 0);
  if (col < 0) throw new Error('人件費の列が見つかりません: ' + header.join(', '));
  const toNum = v => Number(String(v).replace(/[,¥\s]/g, '')) || 0;
  const total = src.slice(1).reduce((sum, r) => sum + toNum(r[col]), 0);

  // 日付の列があればそれを使い、なければ書き出した時刻（朝6時前は前日の営業分）
  const dateCol = header.findIndex(h => /日付|出勤日|営業日/.test(h));
  let date = null;
  if (dateCol >= 0) {
    const v = src.slice(1).map(r => String(r[dateCol]).trim()).find(v => v);
    if (v) date = new Date(v.replace(/-/g, '/'));
  }
  if (!date || isNaN(date)) date = new Date(file.getLastUpdated().getTime() - 6 * 3600 * 1000);
  const ym = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy.M');
  const day = Number(Utilities.formatDate(date, 'Asia/Tokyo', 'd'));

  const sheet = SpreadsheetApp.openById(SALES_SHEET_ID).getSheetByName(ym);
  if (!sheet) throw new Error('売上管理表に「' + ym + '」のタブがありません');
  const row = sheet.getRange(2, 1, 31, 1).getValues().map(r => Number(r[0])).indexOf(day);
  if (row < 0) throw new Error('売上管理表の「' + ym + '」に ' + day + ' 日の行がありません');
  const girlsCol = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].indexOf('女子給') + 1;
  if (girlsCol < 1) throw new Error('売上管理表に「女子給」の列がありません');
  sheet.getRange(row + 2, girlsCol).setValue(total);

  props.setProperty('lastImported', stamp);
  Logger.log(ym + ' ' + day + '日の女子給に ' + total + ' を入れました');
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
