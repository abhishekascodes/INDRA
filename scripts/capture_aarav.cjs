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
    defaultViewport: { width: 1600, height: 1200 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1500);

  // Click persona switcher
  const personaBtn = await page.$('button[title="Switch Synthetic Citizen Persona"]');
  if (personaBtn) {
    await personaBtn.click();
    await sleep(500);

    // Click Aarav Patel in the dropdown
    const aaravOption = await page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll('div'));
      return items.find((el) => el.textContent.includes('Aarav Patel') && el.textContent.includes('MSME'));
    });

    if (aaravOption.asElement()) {
      await aaravOption.asElement().click();
      await sleep(2000);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'screenshot_08_aarav_profile.png'),
        fullPage: false,
      });
      console.log('Captured Aarav Patel profile screenshot!');
    }
  }

  await browser.close();
}

run().catch(console.error);
