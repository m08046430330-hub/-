// 「コンパニオン支給額」フォルダに置かれた一番新しいExcelを
// 「Excel貼り付け」シートに自動で取り込むスクリプト

const FOLDER_ID = '15sRvRW_saMQj0QwejWKjJADpn7c5ZyUP'; // コンパニオン支給額フォルダ
const SHEET_NAME = 'Excel貼り付け';
const SPREADSHEET_ID = '12PsHkSdtbwos9lioVvxLlhUfyhWp1bPiAK8b73J0IWE'; // コンパニオン支給額

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
  const name = importLatestExcel(true);
  const msg = name ? '取り込みました：' + name : 'フォルダにExcelがありません';
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

function importLatestExcel(force) {
  const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
  let latest = null;
  while (files.hasNext()) {
    const f = files.next();
    if (!/\.(xlsx|xls)$/i.test(f.getName())) continue;
    if (!latest || f.getLastUpdated() > latest.getLastUpdated()) latest = f;
  }
  if (!latest) return null;

  const props = PropertiesService.getScriptProperties();
  const key = latest.getId() + ':' + latest.getLastUpdated().getTime();
  if (!force && props.getProperty('lastImported') === key) return null;

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
  try {
    const values = SpreadsheetApp.openById(tmp.id).getSheets()[0].getDataRange().getValues();
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    sheet.clearContents();
    if (sheet.getMaxColumns() < values[0].length) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), values[0].length - sheet.getMaxColumns());
    }
    sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  } finally {
    DriveApp.getFileById(tmp.id).setTrashed(true);
  }
  props.setProperty('lastImported', key);
  return latest.getName();
}
