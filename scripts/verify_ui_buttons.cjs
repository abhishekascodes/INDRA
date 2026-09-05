const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\AbhishekPC\\.gemini\\antigravity\\brain\\0fc6c9f4-e1e2-4378-88e2-ff080e0571d8';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching browser to test Aarav Patel action plans and buttons...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1600, height: 1100 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(2000);

  // Switch to Aarav Patel
  console.log('Switching to Aarav Patel via dropdown...');
  const personaBtn = await page.$('button[title="Switch Synthetic Citizen Persona"]');
  if (personaBtn) {
    await personaBtn.click();
    await sleep(500);

    const aaravOption = await page.$('div[data-citizen-name*="Aarav"]');
    if (aaravOption) {
      await aaravOption.click();
      await sleep(2500);
      console.log('Successfully switched to Aarav Patel!');
    }
  }

  // Navigate to #action-plans
  console.log('Navigating to Action Plans tab...');
  await page.evaluate(() => {
    window.location.hash = '#action-plans';
  });
  await sleep(2500);

  // Capture Aarav's Action Plans
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot_14_aarav_action_plans.png'),
    fullPage: false,
  });
  console.log('Captured screenshot_14_aarav_action_plans.png');

  // Test clicking "Moving to Another City" to generate/ensure relocation plan
  console.log('Testing "Moving to Another City" button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(btn => btn.textContent.includes('Moving to Another City'));
    if (b) b.click();
  });
  await sleep(3000);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot_15_aarav_relocation_plan.png'),
    fullPage: false,
  });
  console.log('Captured screenshot_15_aarav_relocation_plan.png');

  // Test clicking "Starting a New Job" button
  console.log('Testing "Starting a New Job" button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(btn => btn.textContent.includes('Starting a New Job'));
    if (b) b.click();
  });
  await sleep(3000);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot_16_aarav_new_job_plan.png'),
    fullPage: false,
  });
  console.log('Captured screenshot_16_aarav_new_job_plan.png');

  // Navigate to Home tab for Aarav
  console.log('Navigating to Home tab for Aarav...');
  await page.evaluate(() => {
    window.location.hash = '#home';
  });
  await sleep(2500);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot_17_aarav_home_screen.png'),
    fullPage: false,
  });
  console.log('Captured screenshot_17_aarav_home_screen.png');

  // Test "Check 26AS & Status" button on Aarav's Home
  console.log('Testing "Check 26AS & Status" button on Home...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(btn => btn.textContent.includes('Check 26AS & Status'));
    if (b) b.click();
  });
  await sleep(3000);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot_18_aarav_itr_workspace.png'),
    fullPage: false,
  });
  console.log('Captured screenshot_18_aarav_itr_workspace.png');

  await browser.close();
  console.log('All verification steps completed successfully!');
}

run().catch(console.error);
