// comic/kanji_tee_4koma.html を PNG に書き出す（2倍解像度）
// 使い方: node tools/render_comic.js
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 2 });
  const html = path.resolve(__dirname, "..", "comic", "kanji_tee_4koma.html");
  await page.goto("file://" + html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("svg").screenshot({ path: path.resolve(__dirname, "..", "comic", "kanji_tee_4koma.png") });
  await browser.close();
})();
