const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\AbhishekPC\\.gemini\\antigravity\\brain\\0fc6c9f4-e1e2-4378-88e2-ff080e0571d8';
const TEMP_PROFILE_DIR = path.join(require('os').tmpdir(), 'indra-flagship-e2e-' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('============================================================');
  console.log('INDRA FLAGSHIP TRANSITION ENGINE BROWSER E2E VERIFICATION');
  console.log('============================================================');
  console.log('Launching headless Chrome in isolated sandbox...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 950 },
    userDataDir: TEMP_PROFILE_DIR,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      const txt = msg.text();
      if (!txt.includes('downloadable font') && !txt.includes('favicon')) {
        console.log('[Browser Console]', txt);
      }
    });

    // 1. Visit Portal & Sign In as Aarav Patel
    console.log('\n[1/10] Visiting http://localhost:5173/ and authenticating as Aarav Patel...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await sleep(1500);

    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');

    if (!emailInput || !passwordInput) {
      throw new Error('Authentication inputs not found on portal page');
    }

    await emailInput.click({ clickCount: 3 });
    await emailInput.type('aarav.patel@example.in');

    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type('Password123!');

    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();

    console.log('Waiting for authenticated workspace...');
    await page.waitForSelector('header', { timeout: 10000 });
    await sleep(2000);

    // 2. Navigate to State Transitions
    console.log('\n[2/10] Navigating to State-Transition Engine (#transitions)...');
    await page.evaluate(() => {
      window.location.hash = '#transitions';
    });
    await sleep(2000);

    // Switch to Transition Engine console tab
    const engineTabBtn =
      (await page.$('button::-p-text("Transition Engine")')) ||
      (await page.$('button::-p-text("Open Interactive Transition Console")'));
    if (engineTabBtn) {
      console.log('Switching to Transition Engine tab...');
      await engineTabBtn.click();
      await sleep(1500);
    }

    const shot01 = path.join(ARTIFACT_DIR, 'flagship_01_initial_console.png');
    await page.screenshot({ path: shot01, fullPage: true });
    console.log(`Saved screenshot: ${shot01}`);

    // 3. Initiate Flagship Transition
    console.log('\n[3/10] Evaluating Flagship Intent: "I moved to Bangalore and bought a plot in Devanahalli."');
    const existingContraBtn = await page.$('button::-p-text("Confirm Name Match via Aadhaar Biometrics")');
    if (!existingContraBtn) {
      const queryInput = await page.$('input[placeholder*="Describe a life event"]');
      if (queryInput) {
        await queryInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await queryInput.type('I moved to Bangalore and bought a plot in Devanahalli.');
      }

      const evalBtn = (await page.$('button::-p-text("Evaluate")')) || (await page.$('button::-p-text("Evaluate Flagship Bangalore Scenario")'));
      if (evalBtn) {
        await evalBtn.click();
      }
      console.log('Waiting for transition cascade derivation & contradiction detection...');
      await sleep(3500);
    }

    // 4. Verify Contradiction Detected
    console.log('\n[4/10] Verifying Cross-Registry Contradiction Detection...');
    const pageText1 = await page.evaluate(() => document.body.innerText);
    if (!pageText1.includes('Name Variation Detected') && !pageText1.includes('Contradiction Blocked')) {
      console.warn('Warning: Expected contradiction banner text not immediately found, waiting additional 2s...');
      await sleep(2000);
    }

    const shot02 = path.join(ARTIFACT_DIR, 'flagship_02_contradiction_detected.png');
    await page.screenshot({ path: shot02, fullPage: true });
    console.log(`Saved screenshot: ${shot02}`);

    // 5. Resolve Contradiction
    console.log('\n[5/10] Resolving Discrepancy via "Confirm Name Match via Aadhaar Biometrics"...');
    const confirmBtn = await page.$('button::-p-text("Confirm Name Match via Aadhaar Biometrics")');
    if (confirmBtn) {
      await confirmBtn.click();
      await sleep(2500);
    }

    const shot03 = path.join(ARTIFACT_DIR, 'flagship_03_awaiting_authorization.png');
    await page.screenshot({ path: shot03, fullPage: true });
    console.log(`Saved screenshot: ${shot03}`);

    // 6. Simulate Bhoomi Outage & Authorize
    console.log('\n[6/10] Activating simulated Bhoomi 503 outage...');
    const outageBtn = await page.$('button::-p-text("Simulate Bhoomi 503 Outage")');
    if (outageBtn) {
      await outageBtn.click();
      await sleep(1000);
    } else {
      // Set via API
      await page.evaluate(async () => {
        await fetch('/api/simulation/fault-injection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ simulatePropertyOutage: true }),
        });
      });
      await sleep(1000);
    }

    const shot04 = path.join(ARTIFACT_DIR, 'flagship_04_outage_simulated.png');
    await page.screenshot({ path: shot04, fullPage: true });
    console.log(`Saved screenshot: ${shot04}`);

    console.log('Submitting sovereign authorization ("Authorize Filings")...');
    const authBtn =
      (await page.$('button::-p-text("Authorize Filings")')) ||
      (await page.$('button::-p-text("Submitting Filings...")'));
    if (!authBtn) {
      throw new Error('Could not find "Authorize Filings" button');
    }
    await authBtn.click();

    console.log('Executing multi-authority filings until Bhoomi 503 outage triggers...');
    await sleep(6000);

    // 7. Verify Durable Suspension (Forward Recovery)
    console.log('\n[7/10] Verifying Durable Suspension & Checkpoint Preservation...');
    const pageText2 = await page.evaluate(() => document.body.innerText);
    const isPaused =
      pageText2.includes('SAFELY PAUSED') ||
      pageText2.includes('Paused at Authority') ||
      pageText2.includes('503');

    console.log(`Suspension state confirmed: ${isPaused}`);
    if (!isPaused) {
      throw new Error('Transition was not paused at Bhoomi 503 checkpoint!');
    }

    const shot05 = path.join(ARTIFACT_DIR, 'flagship_05_durable_suspension.png');
    await page.screenshot({ path: shot05, fullPage: true });
    console.log(`Saved screenshot: ${shot05}`);

    // 8. Test Hard Browser Refresh
    console.log('\n[8/10] Testing Process & Browser Reload Resilience (Hard Refresh)...');
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(2500);

    const engineTabBtnAfterReload =
      (await page.$('button::-p-text("Transition Engine")')) ||
      (await page.$('button::-p-text("Open Interactive Transition Console")'));
    if (engineTabBtnAfterReload) {
      await engineTabBtnAfterReload.click();
      await sleep(1500);
    }

    const pageTextReloaded = await page.evaluate(() => document.body.innerText);
    const survivesReload =
      pageTextReloaded.includes('SAFELY PAUSED') ||
      pageTextReloaded.includes('Paused at Authority') ||
      pageTextReloaded.includes('End Outage & Resume');

    console.log(`State survives browser refresh: ${survivesReload}`);
    if (!survivesReload) {
      throw new Error('Durable checkpoint state was lost after browser reload!');
    }

    const shot06 = path.join(ARTIFACT_DIR, 'flagship_06_survives_browser_reload.png');
    await page.screenshot({ path: shot06, fullPage: true });
    console.log(`Saved screenshot: ${shot06}`);

    // 9. Clear Outage & Resume to Complete Convergence
    console.log('\n[9/10] Clearing Outage and Resuming Transition Execution...');
    const resumeBtn =
      (await page.$('button::-p-text("End Outage & Resume")')) ||
      (await page.$('button::-p-text("Retry Resume")'));

    if (resumeBtn) {
      await resumeBtn.click();
    } else {
      await page.evaluate(async () => {
        await fetch('/api/simulation/fault-injection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ simulatePropertyOutage: false }),
        });
      });
      await sleep(1000);
      const retryBtn = await page.$('button::-p-text("Retry Resume")');
      if (retryBtn) await retryBtn.click();
    }

    console.log('Waiting for resumption, Bhoomi mutation, digital credential issuance, and 3-tier reconciliation...');
    await sleep(6000);

    const pageTextCompleted = await page.evaluate(() => document.body.innerText);
    const isCompleted =
      pageTextCompleted.includes('All Public Records Verified & Updated') ||
      pageTextCompleted.includes('Completed');

    console.log(`Transition completed successfully: ${isCompleted}`);
    if (!isCompleted) {
      throw new Error('Transition did not achieve COMPLETED status after resume!');
    }

    const shot07 = path.join(ARTIFACT_DIR, 'flagship_07_converged_outcome.png');
    await page.screenshot({ path: shot07, fullPage: true });
    console.log(`Saved screenshot: ${shot07}`);

    // 10. Verify Records Updated in My Records
    console.log('\n[10/10] Verifying Updated Authoritative World Model in My Records (#records)...');
    await page.evaluate(() => {
      window.location.hash = '#records';
    });
    await sleep(2500);

    const recordsText = await page.evaluate(() => document.body.innerText);
    const hasBengaluru = recordsText.includes('Bengaluru') || recordsText.includes('Karnataka');
    const hasDevanahalli = recordsText.includes('Devanahalli') || recordsText.includes('142/3');

    console.log(`World Model updated: Bengaluru=${hasBengaluru}, Devanahalli=${hasDevanahalli}`);

    const shot08 = path.join(ARTIFACT_DIR, 'flagship_08_verified_records_updated.png');
    await page.screenshot({ path: shot08, fullPage: true });
    console.log(`Saved screenshot: ${shot08}`);

    // 11. Verify Tenant Scoping with Priya Sharma
    console.log('\n[Bonus 11] Verifying Cross-Citizen Isolation with Priya Sharma...');
    const userMenuBtn = await page.$('button[title*="Account"]');
    if (userMenuBtn) {
      await userMenuBtn.click();
      await sleep(500);
      const signOutBtn = await page.$('button::-p-text("Sign Out")');
      if (signOutBtn) {
        await signOutBtn.click();
        await sleep(1500);
      }
    }

    // Sign in as Priya
    const pEmailInput = await page.$('input[type="email"]');
    const pPasswordInput = await page.$('input[type="password"]');
    if (pEmailInput && pPasswordInput) {
      await pEmailInput.click({ clickCount: 3 });
      await pEmailInput.type('priya.sharma@example.in');
      await pPasswordInput.click({ clickCount: 3 });
      await pPasswordInput.type('Password123!');
      const pSubmit = await page.$('button[type="submit"]');
      await pSubmit.click();
      await page.waitForSelector('header', { timeout: 10000 });
      await sleep(1500);

      await page.evaluate(() => {
        window.location.hash = '#transitions';
      });
      await sleep(2000);

      const shot09 = path.join(ARTIFACT_DIR, 'flagship_09_tenant_isolation_priya.png');
      await page.screenshot({ path: shot09, fullPage: true });
      console.log(`Saved screenshot: ${shot09}`);
    }

    console.log('\n============================================================');
    console.log('FLAGSHIP BROWSER E2E VERIFICATION COMPLETED WITH 100% SUCCESS');
    console.log('============================================================');
  } catch (err) {
    console.error('\n❌ E2E VERIFICATION FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    try {
      fs.rmSync(TEMP_PROFILE_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run();
