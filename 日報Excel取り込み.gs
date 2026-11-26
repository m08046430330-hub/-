// ドライブにある「コンパニオン支給額.xlsx」（一番新しいもの）を
// 「Excel貼り付け」シートに取り込むスクリプト
// 取り込むたびに過去の分に追加していく（同じ出勤IDの行は新しい内容で上書き）

const SHEET_NAME = 'Excel貼り付け';
const FILE_NAME = 'コンパニオン支給額.xlsx'; // FileMakerで保存するファイル名
const SPREADSHEET_ID = '12PsHkSdtbwos9lioVvxLlhUfyhWp1bPiAK8b73J0IWE'; // コンパニオン支給額
const KEY_HEADER = '出勤ID'; // 同じ行かどうかを見分ける列

// スプレッドシートを開くと上のメニューに「日報取り込み」が出る
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('日報取り込み')
    .addItem('最新のExcelを取り込む', 'importNow')
    .addItem('自動取り込みをオンにする（5分ごと）', 'setupTrigger')
    .addToUi();
}

// メニューから手動で取り込む（同じファイルでも取り込み直す）
function importNow() {
  const msg = importLatestExcel(true) || 'ドライブに「' + FILE_NAME + '」が見つかりません';
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); }
}

// 5分ごとの自動取り込みを設定する（1回だけ実行すればOK）
function setupTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'autoImport')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoImport').timeBased().everyMinutes(5).create();
  try { SpreadsheetApp.getUi().alert('自動取り込みをオンにしました（5分ごと）'); } catch (e) {}
}

// 自動取り込み（新しいExcelがあるときだけ取り込む）
function autoImport() {
  importLatestExcel(false);
}

// "48,750.00 " のような文字を数字にする
function toNumberIfPossible(v) {
  if (typeof v === 'string' && /^\s*-?[\d,]+(\.\d+)?\s*$/.test(v)) {
    return Number(v.replace(/[,\s]/g, ''));
  }
  return v;
}

function importLatestExcel(force) {
  const files = DriveApp.getFilesByName(FILE_NAME);
  let latest = null;
  while (files.hasNext()) {
    const f = files.next();
    if (!latest || f.getLastUpdated() > latest.getLastUpdated()) latest = f;
  }
  if (!latest) return null;

  const props = PropertiesService.getScriptProperties();
  const stamp = latest.getId() + ':' + latest.getLastUpdated().getTime();
  if (!force && props.getProperty('lastImported') === stamp) return null;

  // ExcelをいったんGoogleスプレッドシートに変換して中身を読む
  const res = UrlFetchApp.fetch(
    'https://www.googleapis.com/drive/v3/files/' + latest.getId() + '/copy',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({ name: '一時変換_' + latest.getName(), mimeType: MimeType.GOOGLE_SHEETS }),
    }
  );
  const tmp = JSON.parse(res.getContentText());
  let newValues;
  try {
    newValues = SpreadsheetApp.openById(tmp.id).getSheets()[0].getDataRange().getValues();
  } finally {
    DriveApp.getFileById(tmp.id).setTrashed(true);
  }
  const header = newValues[0].map(String);
  const newRows = newValues.slice(1)
    .filter(r => r.some(c => c !== ''))
    .map(r => r.map(toNumberIfPossible));
  const keyCol = header.indexOf(KEY_HEADER);

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const old = sheet.getDataRange().getValues();
  const sameHeader = old.length > 0 && old[0].map(String).join('\t') === header.join('\t');

  let rows;
  if (sameHeader && keyCol >= 0) {
    // 過去の分を残し、今回のExcelと同じ出勤IDの行だけ入れ替える
    const newKeys = new Set(newRows.map(r => String(r[keyCol])));
    rows = old.slice(1)
      .filter(r => r.some(c => c !== '') && !newKeys.has(String(r[keyCol])))
      .concat(newRows);
  } else {
    // 初回や見出しが変わったときは入れ替え
    rows = newRows;
  }

  sheet.clearContents();
  const all = [header].concat(rows);
  if (sheet.getMaxColumns() < header.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), header.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, all.length, header.length).setValues(all);

  props.setProperty('lastImported', stamp);
  return '取り込みました：' + newRows.length + '行（合計 ' + rows.length + '行）';
}
