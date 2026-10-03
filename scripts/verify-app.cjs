// End-to-end check in isolated Chrome profiles; never touches the user's browser.
// Usage: node scripts/verify-app.cjs [path-to-playwright] [base-url]
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.argv[3] || 'http://localhost:8081';
const results = path.resolve(__dirname, '../test-results');
const screenshots = path.resolve(__dirname, '../design/live');
const dayString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = dayString(new Date());
const future = new Date();
future.setDate(future.getDate() + 2);
const opens = dayString(future);
const past = new Date();
past.setDate(past.getDate() - 1);
const yesterday = dayString(past);
const errors = [];
let activePage;
async function visible(page, text) {
  await page.getByText(text, { exact: true }).last().waitFor({ state: 'visible' });
}
async function shot(page, name) {
  await page.getByRole('heading').first().waitFor();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(screenshots, `${name}.png`) });
}
async function readStore(page, key) {
  return page.evaluate(
    (key) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('little-days', 1);
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction('records').objectStore('records').get(key);
          request.onsuccess = () => {
            db.close();
            resolve(request.result);
          };
          request.onerror = reject;
        };
        open.onerror = reject;
      }),
    key,
  );
}
async function main() {
  await fs.mkdir(results, { recursive: true });
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      permissions: ['camera', 'microphone'],
      acceptDownloads: true,
      reducedMotion: 'reduce',
    });
    context.setDefaultTimeout(15_000);
    context.setDefaultNavigationTimeout(60_000);
    const page = await context.newPage();
    activePage = page;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(base);
    await page.getByRole('button', { name: 'start my sketchbook', exact: true }).waitFor();
    await shot(page, '01-onboarding');
    await page.getByRole('button', { name: 'start my sketchbook', exact: true }).click();
    const words = page.getByRole('textbox', { name: /one thing i want to remember/i });
    await words.fill('golden light on the walk home. testing a little memory.');
    await page.getByRole('radio', { name: 'calm mood' }).click();
    await page.getByRole('button', { name: 'Save today', exact: true }).click();
    await page.getByRole('button', { name: 'Memory saved', exact: true }).waitFor();
    await page.reload();
    await words.waitFor();
    assert.equal(
      await words.inputValue(),
      'golden light on the walk home. testing a little memory.',
    );
    await shot(page, '02-today');
    await page.getByRole('button', { name: 'year', exact: true }).click();
    await page.getByRole('button', { name: `${today}, calm memory`, exact: true }).click();
    await page.getByRole('button', { name: 'edit this memory', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'tags (comma separated, up to eight)', exact: true })
      .fill('outside, slow moments');
    await page.getByRole('button', { name: 'mug doodle', exact: true }).click();
    await words.fill('a quiet morning, coffee and golden light.');
    await page.getByRole('button', { name: 'Save memory', exact: true }).click();
    await visible(page, 'a quiet morning, coffee and golden light.');
    await shot(page, '03-memory');
    console.log('PASS: first save, reload, calendar, edit, tags, doodle');
    // Photo picker: real file chooser, durable browser attachment, then explicit save.
    await page.getByRole('button', { name: 'edit this memory', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Add photo', exact: true }).click();
    await (await chooser).setFiles(path.resolve(__dirname, '../assets/little-days-icon.png'));
    await visible(page, 'photo added.');
    await page.getByRole('button', { name: 'Save memory', exact: true }).click();
    await page.getByRole('button', { name: 'View photo 1 full size' }).waitFor();
    await page.getByRole('button', { name: 'View photo 1 full size' }).click();
    await page.getByRole('button', { name: 'Close full-size photo' }).click();
    // Capsule snapshots do not change when the original day is edited later.
    await page.getByRole('button', { name: 'add to a time capsule', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'capsule name', exact: true })
      .fill('a little sunshine');
    await page.getByRole('textbox', { name: 'opens on (YYYY-MM-DD)', exact: true }).fill(opens);
    await page
      .getByRole('textbox', { name: 'a note for future you', exact: true })
      .fill('dear future me, remember this light.');
    await page.getByRole('button', { name: 'seal for later', exact: true }).click();
    await page
      .getByRole('button', { name: `a little sunshine, sealed until ${opens}`, exact: true })
      .waitFor();
    await page
      .getByRole('button', { name: `a little sunshine, sealed until ${opens}`, exact: true })
      .click();
    await visible(page, `this little letter opens ${opens}.`);
    await shot(page, '04-capsules');
    console.log('PASS: photo picker, viewer, sealed capsule');
    await page.goto(`${base}/edit/${today}`);
    await words.fill('changed original: a quiet morning.');
    await page.getByRole('button', { name: 'Save memory', exact: true }).click();
    await visible(page, 'changed original: a quiet morning.');
    const capsules = JSON.parse(await readStore(page, '@little-days/capsules/v1'));
    assert.equal(
      capsules.capsules[0].memories[0].text,
      'a quiet morning, coffee and golden light.',
    );
    // Backfill, leave before saving, and recover the autosaved draft after reload.
    await page.goto(`${base}/edit/${yesterday}`);
    await words.fill('a draft before today');
    await page.getByRole('button', { name: 'Go back, draft kept', exact: true }).click();
    await page.goto(`${base}/edit/${yesterday}`);
    assert.equal(await words.inputValue(), 'a draft before today');
    await page.getByRole('button', { name: 'Save memory', exact: true }).click();
    await visible(page, 'a draft before today');
    await page.goto(`${base}/search`);
    await page.getByRole('textbox', { name: 'Search memories', exact: true }).fill('QUIET outside');
    await visible(page, '1 little day');
    await page.getByRole('button', { name: 'Filter by photos', exact: true }).click();
    await visible(page, '1 little day');
    await shot(page, '05-search');
    await page
      .getByRole('textbox', { name: 'Search memories', exact: true })
      .fill('does not exist');
    await visible(page, 'no days found');
    await page.goto(`${base}/rewind`);
    await visible(page, 'days captured');
    await shot(page, '06-rewind');
    await page.getByRole('button', { name: /make a .* recap/, exact: false }).click();
    await page.getByRole('button', { name: 'export text recap' }).waitFor();
    const recapDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'export text recap' }).click();
    const recap = await recapDownload;
    await recap.saveAs(path.join(results, 'recap.txt'));
    assert.match(
      await fs.readFile(path.join(results, 'recap.txt'), 'utf8'),
      /changed original: a quiet morning/,
    );
    // Customizations are persisted and affect both calendar and editor.
    await page.goto(`${base}/settings`);
    await page.getByRole('button', { name: /week starts on, monday/ }).click();
    await page.getByRole('button', { name: /week starts on, sunday/ }).waitFor();
    await page.getByRole('button', { name: /writing style, typewriter/ }).click();
    await page.getByRole('button', { name: /writing style, handwritten/ }).waitFor();
    await page.getByRole('button', { name: /colors & doodles/ }).click();
    await page.getByRole('button', { name: 'Default book doodle', exact: true }).click();
    await visible(
      page,
      'new days will start with this doodle. your existing memories stay just as they are.',
    );
    await page.goto(`${base}/settings`);
    await shot(page, '07-settings');
    console.log('PASS: draft recovery, search, rewind, recap, settings');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: /export my memories,/ }).click();
    const download = await downloadEvent;
    const backupFile = path.join(results, 'roundtrip.backup.json');
    await download.saveAs(backupFile);
    const backup = JSON.parse(await fs.readFile(backupFile, 'utf8'));
    assert.equal(Object.keys(backup.records).length, 2);
    assert.match(backup.records[today].saved.photos[0].uri, /^data:image/);
    assert.equal(backup.capsules.length, 1);
    // Restore to a clean profile and repeat import: safe additive merge and no duplicates.
    const restored = await browser.newContext({
      viewport: { width: 375, height: 812 },
      acceptDownloads: true,
    });
    restored.setDefaultTimeout(15_000);
    restored.setDefaultNavigationTimeout(60_000);
    const other = await restored.newPage();
    other.on('pageerror', (error) => errors.push(error.message));
    await other.goto(`${base}/settings`);
    const importChooser = other.waitForEvent('filechooser');
    await other.getByRole('button', { name: /import a sketchbook,/ }).click();
    await (await importChooser).setFiles(backupFile);
    await visible(
      other,
      '2 days imported. existing dates and drafts were kept; new capsules were added.',
    );
    await other.goto(`${base}/edit/${today}`);
    await other
      .getByRole('textbox', { name: /one thing i want to remember/i })
      .fill('keep this newer draft');
    await other.goto(`${base}/settings`);
    const againChooser = other.waitForEvent('filechooser');
    await other.getByRole('button', { name: /import a sketchbook,/ }).click();
    await (await againChooser).setFiles(backupFile);
    await visible(
      other,
      '0 days imported. existing dates and drafts were kept; new capsules were added.',
    );
    await other.goto(`${base}/edit/${today}`);
    assert.equal(
      await other.getByRole('textbox', { name: /one thing i want to remember/i }).inputValue(),
      'keep this newer draft',
    );
    assert.equal(JSON.parse(await readStore(other, '@little-days/capsules/v1')).capsules.length, 1);
    // Invalid backup is rejected before mutation.
    const invalidFile = path.join(results, 'invalid.backup.json');
    await fs.writeFile(invalidFile, JSON.stringify({ ...backup, version: 99 }));
    await other.goto(`${base}/settings`);
    const badChooser = other.waitForEvent('filechooser');
    await other.getByRole('button', { name: /import a sketchbook,/ }).click();
    await (await badChooser).setFiles(invalidFile);
    await other.getByText(/import stopped: Not a supported/).waitFor();
    // Capsule can be opened after date; preserved copy is available even after deleting original.
    await other.clock.install({ time: new Date(`${opens}T12:00:00`) });
    await other.goto(`${base}/capsules`);
    await other.getByRole('button', { name: 'Open a little sunshine', exact: true }).click();
    await visible(other, 'dear future me, remember this light.');
    await other.getByRole('button', { name: new RegExp(`Open memory for ${today}:`) }).click();
    await visible(other, 'a quiet morning, coffee and golden light.');
    await shot(other, '08-opened-capsule');
    await other.goto(`${base}/memory/${today}`);
    await other.getByRole('button', { name: 'Delete memory', exact: true }).click();
    await other.getByRole('button', { name: 'keep it', exact: true }).click();
    await other.getByRole('button', { name: 'Delete memory', exact: true }).click();
    await other.getByRole('button', { name: 'yes, delete', exact: true }).click();
    await other.waitForURL('**/year');
    assert.equal(await readStore(other, `@little-days/v1/${today}`), undefined);
    await other.goto(`${base}/capsules`);
    await other.getByRole('button', { name: 'Open a little sunshine', exact: true }).click();
    await other.getByRole('button', { name: new RegExp(`Open memory for ${today}:`) }).click();
    await visible(other, 'a quiet morning, coffee and golden light.');
    // Simulated Chrome devices exercise permission/capture and audio state, not real phone hardware.
    await page.goto(`${base}/edit/${today}`);
    await page.getByRole('button', { name: 'Add camera', exact: true }).click();
    await page.getByRole('button', { name: 'Take photo', exact: true }).waitFor();
    const allow = page.getByRole('button', { name: 'allow camera access', exact: true });
    if (await allow.isVisible()) await allow.click();
    await page.getByRole('button', { name: 'Take photo', exact: true }).click();
    await page.getByRole('button', { name: 'use this little moment', exact: true }).waitFor();
    await shot(page, '09-camera');
    await page.getByRole('button', { name: 'use this little moment', exact: true }).click();
    await page.waitForURL(`**/edit/${today}`);
    await page.getByRole('button', { name: 'Add voice', exact: true }).click();
    await page.getByRole('button', { name: 'Stop voice recording', exact: true }).waitFor();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Stop voice recording', exact: true }).click();
    await visible(page, 'voice note added.');
    await page.getByRole('button', { name: 'Play voice note', exact: true }).click();
    await page.getByRole('button', { name: 'Save memory', exact: true }).click();
    await page.getByRole('button', { name: 'Play voice note', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Play voice note', exact: true }).waitFor();
    assert.match(
      JSON.parse(await readStore(page, `@little-days/v1/${today}`)).saved.voice.uri,
      /^data:audio\/webm/,
    );
    // Small phone / landscape / tablet, no horizontal overflow or error overlays.
    for (const [width, height] of [
      [375, 812],
      [844, 390],
      [1024, 768],
    ]) {
      await page.setViewportSize({ width, height });
      for (const route of [
        '/',
        '/year',
        '/search',
        '/rewind',
        '/settings',
        '/capsules',
        '/onboarding',
        `/edit/${today}`,
        `/memory/${today}`,
      ]) {
        await page.goto(base + route);
        await page.getByRole('heading').first().waitFor();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
          true,
          `${route} overflows ${width}`,
        );
      }
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${base}/year`);
    await shot(page, '10-year-small');
    // Quota failure does not falsely report a saved day or overwrite the prior save.
    await page.goto(`${base}/edit/${today}`);
    await words.waitFor();
    const prior = JSON.parse(await readStore(page, `@little-days/v1/${today}`));
    await page.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      window.__littleDaysPut = original;
      IDBObjectStore.prototype.put = function (...args) {
        if (String(args[1]).startsWith('@little-days/v1/'))
          throw new DOMException('Test quota failure', 'QuotaExceededError');
        return original.apply(this, args);
      };
    });
    await words.fill('a draft that could not fit');
    await page.getByRole('button', { name: 'Save memory', exact: true }).click();
    await page.getByText(/could not save this day/).waitFor();
    assert.equal(await words.inputValue(), 'a draft that could not fit');
    assert.equal(
      JSON.parse(await readStore(page, `@little-days/v1/${today}`)).saved.text,
      prior.saved.text,
    );
    await page.evaluate(() => {
      IDBObjectStore.prototype.put = window.__littleDaysPut;
    });
    await page.getByRole('button', { name: 'Save memory', exact: true }).click();
    await visible(page, 'a draft that could not fit');
    // A malformed record is kept verbatim and is never autosaved over.
    await page.evaluate(
      (key) =>
        new Promise((resolve, reject) => {
          const open = indexedDB.open('little-days', 1);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction('records', 'readwrite');
            tx.objectStore('records').put('{broken-test-record', key);
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = reject;
          };
        }),
      `@little-days/v1/${today}`,
    );
    await page.goto(`${base}/edit/${today}`);
    await page.getByText(/some stored data could not be read/).waitFor();
    assert.equal(await words.isEditable(), false);
    assert.equal(await readStore(page, `@little-days/v1/${today}`), '{broken-test-record');
    await page.goto(`${base}/settings`);
    const recoveryDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: /export a recovery copy,/ }).click();
    const recovery = await recoveryDownload;
    await recovery.saveAs(path.join(results, 'recovery.json'));
    assert.equal(
      JSON.parse(await fs.readFile(path.join(results, 'recovery.json'), 'utf8')).raw[
        `@little-days/v1/${today}`
      ],
      '{broken-test-record',
    );
    const emptyDay = new Date();
    emptyDay.setDate(emptyDay.getDate() - 2);
    const emptyDate = dayString(emptyDay);
    await page.goto(`${base}/edit/${emptyDate}`);
    await page.getByRole('button', { name: 'Save memory', exact: true }).click();
    await page.waitForURL(`**/memory/${emptyDate}`);
    assert.equal(
      JSON.parse(await readStore(page, `@little-days/v1/${emptyDate}`)).saved.doodle,
      'book',
      'default doodle applies even when saving a mood-only day',
    );
    assert.deepEqual(errors, [], `browser errors: ${errors.join('\n')}`);
    await context.close();
    await restored.close();
    console.log(
      'PASS: onboarding; mood/text save and reload; tags/doodles; photo picker and viewer; backfill/draft navigation; search; rewind/recap; customization; portable backup/restore; conflict-safe repeated import; invalid backup rejection; sealed/open capsules and snapshots; deletion confirmation; simulated camera/voice; 375px/landscape/tablet layouts; quota errors without false saves; corruption protection and raw recovery export.',
    );
  } catch (error) {
    if (activePage && !activePage.isClosed()) {
      console.error('FAILED at', activePage.url(), await activePage.locator('body').innerText());
      await activePage.screenshot({ path: path.join(results, 'failure.png') });
    }
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
