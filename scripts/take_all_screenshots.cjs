const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\AbhishekPC\\.gemini\\antigravity\\brain\\0fc6c9f4-e1e2-4378-88e2-ff080e0571d8';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching browser with puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: {
      width: 1600,
      height: 1200,
      deviceScaleFactor: 1,
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()));

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(2000);

  // 1. Home screen
  console.log('Capturing Home screen...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot_01_home.png'),
    fullPage: false,
  });

  // 2. Persona Switcher Dropdown
  console.log('Opening Persona Switcher Dropdown...');
  const personaBtn = await page.$('button[title="Switch Synthetic Citizen Persona"]');
  if (personaBtn) {
    await personaBtn.click();
    await sleep(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_02_persona_dropdown.png'),
      fullPage: false,
    });
    // Close dropdown
    await page.click('header');
    await sleep(400);
  }

  // 3. Public Record Tab
  console.log('Navigating to Public Record...');
  const publicRecordBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    return btns.find((b) => b.textContent.includes('Public Record'));
  });
  if (publicRecordBtn.asElement()) {
    await publicRecordBtn.asElement().click();
    await sleep(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_03_public_record.png'),
      fullPage: false,
    });
  }

  // 4. Action Plans Tab
  console.log('Navigating to Action Plans...');
  const actionPlansBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    return btns.find((b) => b.textContent.includes('Action Plans'));
  });
  if (actionPlansBtn.asElement()) {
    await actionPlansBtn.asElement().click();
    await sleep(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_04_action_plans.png'),
      fullPage: false,
    });
  }

  // 5. Inbox / Action Center Tab
  console.log('Navigating to Inbox...');
  const inboxBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    return btns.find((b) => b.textContent.includes('Inbox'));
  });
  if (inboxBtn.asElement()) {
    await inboxBtn.asElement().click();
    await sleep(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_05_inbox.png'),
      fullPage: false,
    });
  }

  // 6. Vault Tab
  console.log('Navigating to Vault...');
  const vaultBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    return btns.find((b) => b.textContent.includes('Vault'));
  });
  if (vaultBtn.asElement()) {
    await vaultBtn.asElement().click();
    await sleep(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_06_vault.png'),
      fullPage: false,
    });
  }

  // 7. Universal Review Console
  console.log('Navigating to Home and launching Harmonize workflow...');
  const homeBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    return btns.find((b) => b.textContent.includes('Home'));
  });
  if (homeBtn.asElement()) {
    await homeBtn.asElement().click();
    await sleep(1000);

    // Click "Harmonize →"
    const harmonizeBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.textContent.includes('Harmonize'));
    });
    if (harmonizeBtn.asElement()) {
      await harmonizeBtn.asElement().click();
      await sleep(2500);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'screenshot_07_review_console.png'),
        fullPage: false,
      });
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
