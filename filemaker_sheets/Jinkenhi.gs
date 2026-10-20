/**
 * FileMaker で書き出したファイルを読んで、売上管理表のその日の欄に入れる（女性台帳の取り込みとは別のプロジェクト）。
 *   人件費.xlsx   → 人件費の合計を「女子給」に
 *   営業日報.xlsx → GrandTotal の合計を「売上実績」に（複数日まとめて書き出しても1日ずつ入る）
 * 準備：エディタ左の「サービス」で Drive API を追加 → setup を1回実行。
 */

const FOLDER_ID = '1aL4aBjF6PlcI4pGr4Zg9YYr1Ac6ox7td';  // ドライブの「FileMaker書き出し」フォルダ
const SALES_SHEET_ID = '1UgBqm6epbf8pbF85gh3oK2C9oM4Q6MC8S3nRmpepaMo';  // いまは試作のコピー

function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('importAll').timeBased().everyMinutes(5).create();
  importAll(true);
}

function importAll(force) {
  force = force === true;
  runIfChanged_('人件費.xlsx', force, importJinkenhi_);
  runIfChanged_('営業日報.xlsx', force, importNippo_);
}

function runIfChanged_(fileName, force, fn) {
  let file = null;
  const files = DriveApp.getFolderById(FOLDER_ID).getFilesByName(fileName);
  while (files.hasNext()) {
    const f = files.next();
    if (!file || f.getLastUpdated() > file.getLastUpdated()) file = f;
  }
  if (!file) return;
  const props = PropertiesService.getScriptProperties();
  const key = 'lastImported:' + fileName;
  const stamp = file.getId() + '@' + file.getLastUpdated().getTime();
  if (!force && props.getProperty(key) === stamp) return;
  fn(file);
  props.setProperty(key, stamp);
}

// 人件費の合計（「人件費(残り)」は除く）を、その日の「女子給」に入れる
function importJinkenhi_(file) {
  const src = readXlsx_(file);
  const header = src[0].map(h => String(h).trim());
  let col = header.indexOf('人件費');
  if (col < 0) col = header.findIndex(h => h.indexOf('人件費') >= 0 && h.indexOf('残') < 0);
  if (col < 0) throw new Error('人件費の列が見つかりません: ' + header.join(', '));
  const total = src.slice(1).reduce((sum, r) => sum + toNum_(r[col]), 0);

  const dateCol = findDateCol_(header);
  const v = dateCol < 0 ? '' : src.slice(1).map(r => String(r[dateCol]).trim()).find(v => v);
  // 日付の列がなければ書き出した時刻（朝6時前は前日の営業分）
  const date = v ? parseDate_(v) : new Date(file.getLastUpdated().getTime() - 6 * 3600 * 1000);
  writeDay_(date, '女子給', total);
}

// 1行が1日分。GrandTotal の列のうち一番大きい値（＝現金・カードなどの合計）を「売上実績」に入れる
function importNippo_(file) {
  const src = readXlsx_(file);
  const header = src[0].map(h => String(h).trim());
  const gtCols = header.map((h, i) => /grand|ｇｒａｎｄ|総合計/i.test(h) ? i : -1).filter(i => i >= 0);
  const dateCol = findDateCol_(header);
  if (!gtCols.length || dateCol < 0) {
    throw new Error('GrandTotal か日付の列が見つかりません: ' + header.join(', '));
  }
  src.slice(1).forEach(r => {
    const v = String(r[dateCol]).trim();
    if (!v) return;
    const total = Math.max(...gtCols.map(i => toNum_(r[i])));
    writeDay_(parseDate_(v), '売上実績', total);
  });
}

function findDateCol_(header) {
  return header.findIndex(h => /日付|出勤日|営業日(?!数)|^date/i.test(h));
}

function parseDate_(v) {
  const m = String(v).match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
  if (!m) throw new Error('日付が読めません: ' + v);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

function toNum_(v) {
  return Number(String(v).replace(/[,¥￥\\\s]/g, '')) || 0;
}

// 売上管理表の「yyyy.M」タブで、その日の行・指定の見出しの列に値を入れる
function writeDay_(date, columnName, value) {
  const ym = date.getFullYear() + '.' + (date.getMonth() + 1);
  const day = date.getDate();
  const sheet = SpreadsheetApp.openById(SALES_SHEET_ID).getSheetByName(ym);
  if (!sheet) throw new Error('売上管理表に「' + ym + '」のタブがありません');
  const row = sheet.getRange(2, 1, 31, 1).getValues().map(r => Number(r[0])).indexOf(day);
  if (row < 0) throw new Error('売上管理表の「' + ym + '」に ' + day + ' 日の行がありません');
  const col = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].indexOf(columnName) + 1;
  if (col < 1) throw new Error('売上管理表に「' + columnName + '」の列がありません');
  sheet.getRange(row + 2, col).setValue(value);
  Logger.log(ym + ' ' + day + '日の' + columnName + 'に ' + value + ' を入れました');
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
