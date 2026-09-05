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
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1500);

  // Switch to Aarav
  const personaBtn = await page.$('button[title="Switch Synthetic Citizen Persona"]');
  if (personaBtn) {
    await personaBtn.click();
    await sleep(500);
    const aaravOption = await page.$('div[data-citizen-name*="Aarav"]');
    if (aaravOption) {
      await aaravOption.click();
      await sleep(2000);
    }
  }

  // Go to action plans
  await page.evaluate(() => {
    window.location.hash = '#action-plans';
  });
  await sleep(2000);

  // Select Employment plan tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const empTab = tabs.find(t => t.textContent.includes('Employment Transition'));
    if (empTab) empTab.click();
  });
  await sleep(1500);

  // Click the first "Authorize & Run" button
  console.log('Clicking "Authorize & Run" on first step...');
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const authBtn = btns.find(b => b.textContent.includes('Authorize & Run'));
    if (authBtn) {
      authBtn.click();
      return true;
    }
    return false;
  });
  console.log('Button clicked:', clicked);
  await sleep(4000);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot_19_aarav_after_auth_run.png'),
    fullPage: false,
  });
  console.log('Captured screenshot_19_aarav_after_auth_run.png');

  await browser.close();
}

run().catch(console.error);
