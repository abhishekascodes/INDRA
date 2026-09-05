const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\AbhishekPC\\.gemini\\antigravity\\brain\\0fc6c9f4-e1e2-4378-88e2-ff080e0571d8';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1600, height: 1100 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  
  // 1. Open action-plans tab
  await page.goto('http://127.0.0.1:5173/#action-plans', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(2000);

  // Switch to Aarav Patel if not already selected
  const isAarav = await page.evaluate(() => document.body.innerText.includes('Aarav Patel'));
  if (!isAarav) {
    const switcher = await page.$('[data-testid="citizen-switcher-btn"]');
    if (switcher) {
      await switcher.click();
      await sleep(600);
      const aaravItem = await page.$('[data-citizen-name="Aarav Patel"]');
      if (aaravItem) {
        await aaravItem.click();
        await sleep(1500);
      }
    }
  }

  // Click on Employment Transition plan if available
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const empBtn = buttons.find(b => b.innerText.includes('Employment Transition') || b.innerText.includes('Starting a New Job'));
    if (empBtn) empBtn.click();
  });
  await sleep(1500);

  // Take screenshot of Action Plans with clean prerequisites
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot_20_clean_prerequisites.png'),
    fullPage: false,
  });
  console.log('Captured screenshot_20_clean_prerequisites.png');

  // Also check if there is a Retry Action button to test execution
  const retryBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.innerText.includes('Retry Action'));
  });
  if (retryBtn && retryBtn.asElement()) {
    console.log('Clicking Retry Action button...');
    await retryBtn.asElement().click();
    await sleep(2500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_21_after_retry_action.png'),
      fullPage: false,
    });
    console.log('Captured screenshot_21_after_retry_action.png');
  }

  // Also visit Public Record tab to verify clean public records
  await page.goto('http://127.0.0.1:5173/#world-model', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot_22_clean_world_model.png'),
    fullPage: false,
  });
  console.log('Captured screenshot_22_clean_world_model.png');

  // Also visit Inbox tab to verify clean consents & notices
  await page.goto('http://127.0.0.1:5173/#inbox', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot_23_clean_inbox.png'),
    fullPage: false,
  });
  console.log('Captured screenshot_23_clean_inbox.png');

  await browser.close();
}

run().catch(console.error);
