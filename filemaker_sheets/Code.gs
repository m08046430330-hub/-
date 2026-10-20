/**
 * FileMaker で書き出した Excel/CSV を、ファイル名ごとに決まったシートへ自動で取り込む。
 * Google ドライブの「FileMaker書き出し」フォルダを5分ごとに確認し、新しいファイルがあれば反映する。
 * 準備：エディタ左の「サービス」で Drive API を追加 → setup を1回実行。
 */

const FOLDER_ID = '1aL4aBjF6PlcI4pGr4Zg9YYr1Ac6ox7td';

// 書き出すファイル名（拡張子なし） → 取り込み先のシート
const TARGETS = [
  { file: '女性台帳試作品', sheet: '女性台帳' },
  { file: '女性情報', sheet: '女性情報' },
];

// シートの見出し → FileMaker 側の見出し（見出しセルにメモがあれば、そちらを優先）
const ALIASES = {
  '女性ID': ['女性ID', 'CastID', 'ID'],
  '在籍女性No': ['在籍女性No', 'C_在籍CastNO'],
  '女性No': ['女性No', 'CastNO'],
  '在籍': ['在籍', 'F_在籍'],
  '売上管理表に表示': ['売上管理表に表示', 'F_score_表示'],
  '当日出勤': ['当日出勤', 'F_当日出勤'],
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
  'メールアドレス': ['メールアドレス', 'mail1', 'メール'],
};
const CHECKBOX_COLUMNS = ['売上管理表に表示', '当日出勤'];

function setup() {
  ScriptApp.getProjectTriggers()
    .filter(t => ['importLatest', 'importAll'].indexOf(t.getHandlerFunction()) >= 0)
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('importAll').timeBased().everyMinutes(5).create();
  importAll(true);
}

function importAll(force) {
  const latest = {};
  const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
  while (files.hasNext()) {
    const f = files.next();
    const m = f.getName().match(/^(.*)\.(xlsx|csv)$/i);
    if (!m) continue;
    const key = m[1].trim();
    if (!latest[key] || f.getLastUpdated() > latest[key].getLastUpdated()) latest[key] = f;
  }
  TARGETS.forEach(t => {
    if (latest[t.file]) importFile_(latest[t.file], t.sheet, force === true);
  });
}

function importFile_(file, sheetName, force) {
  const props = PropertiesService.getScriptProperties();
  const stampKey = 'lastImported:' + sheetName;
  const stamp = file.getId() + '@' + file.getLastUpdated().getTime();
  if (!force && props.getProperty(stampKey) === stamp) return;

  const src = (/\.xlsx$/i.test(file.getName()) ? readXlsx_(file) : readCsv_(file))
    .filter(r => r.some(v => String(v).trim() !== ''));
  if (src.length < 2) return;
  const srcHeader = src[0].map(h => String(h).trim());
  const body = src.slice(1);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  if (sheet.getLastColumn() === 0 || String(sheet.getRange(1, 1).getValue()) === '') {
    // 初回は FileMaker の見出しをそのまま使い、見出しを書き換えても対応が分かるようメモに残す
    const head = sheet.getRange(1, 1, 1, srcHeader.length);
    head.setValues([srcHeader]).setNotes([srcHeader]).setFontWeight('bold').setBackground('#d8d1f2');
    sheet.setFrozenRows(1);
  }

  const width = sheet.getLastColumn();
  const firstRow = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
  const notes = sheet.getRange(1, 1, 1, width).getNotes()[0];
  const end = firstRow.indexOf('');
  const header = firstRow.slice(0, end < 0 ? firstRow.length : end);
  const srcIndex = header.map((h, c) => {
    const names = notes[c] ? [notes[c].trim()] : (ALIASES[h] || [h]);
    return names.map(a => srcHeader.indexOf(a)).find(i => i >= 0);
  });

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
    // 口座番号などの先頭0が消えないよう文字列で書く（チェックボックスの列だけは除く）
    const range = sheet.getRange(2, 1, rows.length, header.length).setNumberFormat('@');
    header.forEach((h, c) => {
      if (CHECKBOX_COLUMNS.indexOf(h) >= 0) sheet.getRange(2, c + 1, rows.length, 1).setNumberFormat('General');
    });
    range.setValues(rows);
    sheet.getRange(1, header.length + 2).setValue('最終更新: ' +
      Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '（' + file.getName() + '）');
  } finally {
    lock.releaseLock();
  }
  props.setProperty(stampKey, stamp);
}

function readCsv_(file) {
  const blob = file.getBlob();
  let text = blob.getDataAsString('UTF-8');
  if (text.indexOf('\uFFFD') !== -1) text = blob.getDataAsString('Shift_JIS');  // Windows の書き出しは Shift_JIS のことが多い
  text = text.replace(/^\uFEFF/, '').replace(/\u000B/g, '\n');  // FileMaker はセル内改行を VT で出す
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
