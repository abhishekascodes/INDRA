const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\AbhishekPC\\.gemini\\antigravity\\brain\\0fc6c9f4-e1e2-4378-88e2-ff080e0571d8';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching browser for State-Transition Engine verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1600, height: 1100 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // 1. Navigate to Transitions Console
    console.log('Opening http://127.0.0.1:5173/#transitions ...');
    await page.goto('http://127.0.0.1:5173/#transitions', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);

    // Switch to Aarav Patel if not active
    const isAarav = await page.evaluate(() => document.body.innerText.includes('Aarav Patel') && !document.body.innerText.includes('Priya Sharma\nBengaluru'));
    if (!isAarav) {
      console.log('Switching to Aarav Patel persona...');
      const switcher = await page.$('button[title*="Switch"]');
      if (switcher) {
        await switcher.click();
        await sleep(600);
        const aaravCard = await page.$('[data-citizen-name*="Aarav"]');
        if (aaravCard) {
          await aaravCard.click();
          await sleep(2000);
        }
      }
    }

    // Ensure dropdown is closed
    await page.keyboard.press('Escape');
    await sleep(500);

    // Capture Initial Console
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_24_transition_initial.png'),
    });
    console.log('Captured screenshot_24_transition_initial.png');

    // 2. Click "Load Flagship Scenario"
    console.log('Triggering Flagship Scenario (Devanahalli)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const flagshipBtn = buttons.find((b) => b.innerText && b.innerText.includes('Load Flagship Scenario'));
      if (flagshipBtn) flagshipBtn.click();
    });
    await sleep(3500);

    // Capture Contradiction Detected state
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_25_contradiction_detected.png'),
    });
    console.log('Captured screenshot_25_contradiction_detected.png');

    // 3. Resolve Contradictions
    console.log('Resolving Contradiction...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const resolveBtns = buttons.filter((b) => b.innerText && b.innerText.startsWith('Authorize') && !b.innerText.includes('Execution') && !b.innerText.includes('Transition Execution'));
      for (const btn of resolveBtns) {
        btn.click();
      }
    });
    await sleep(3000);

    // Capture Awaiting Authorization state
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_26_awaiting_authorization.png'),
    });
    console.log('Captured screenshot_26_awaiting_authorization.png');

    // 4. Open Simulation Controls & Enable Outage
    console.log('Enabling simulated Bhoomi 503 outage...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const simBtn = buttons.find((b) => b.innerText && b.innerText.includes('Simulation Controls'));
      if (simBtn) simBtn.click();
    });
    await sleep(800);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const outageBtn = buttons.find((b) => b.innerText && b.innerText.includes('Simulate Outage'));
      if (outageBtn) outageBtn.click();
    });
    await sleep(1000);

    // 5. Authorize Transition (Executes and halts safely upon Bhoomi 503 outage)
    console.log('Authorizing transition while outage is active...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const authBtn = buttons.find((b) => b.innerText && b.innerText.includes('Authorize Transition'));
      if (authBtn) authBtn.click();
    });
    await sleep(4000);

    // Capture Suspended State
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_27_outage_suspended.png'),
    });
    console.log('Captured screenshot_27_outage_suspended.png');

    // 6. Turn off Outage
    console.log('Clearing simulated outage via Reset...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const resetBtn = buttons.find((b) => b.innerText && b.innerText.includes('Reset All'));
      if (resetBtn) resetBtn.click();
    });
    await sleep(1500);

    // 7. Resume Transition from Checkpoint
    console.log('Resuming transition from durable checkpoint...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const resumeBtn = buttons.find((b) => b.innerText && b.innerText.includes('Resume Transition'));
      if (resumeBtn) resumeBtn.click();
    });
    await sleep(6000);

    // Capture Reconciled State
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_28_reconciled_outcome.png'),
    });
    console.log('Captured screenshot_28_reconciled_outcome.png');

    // Capture Full Page Reconciled State & Timeline
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_30_reconciliation_and_timeline_full.png'),
      fullPage: true,
    });
    console.log('Captured screenshot_30_reconciliation_and_timeline_full.png');

    // 8. View World Model Convergence
    console.log('Navigating to World Model Public Record...');
    await page.goto('http://127.0.0.1:5173/#world-model', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_29_world_model_converged.png'),
    });
    console.log('Captured screenshot_29_world_model_converged.png');

    console.log('All flagship screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Screenshot automation error:', err);
  process.exit(1);
});
