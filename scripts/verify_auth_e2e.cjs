const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\AbhishekPC\\.gemini\\antigravity\\brain\\0fc6c9f4-e1e2-4378-88e2-ff080e0571d8';
const TEMP_PROFILE_DIR = path.join(require('os').tmpdir(), 'indra-e2e-profile-' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('[E2E Auth Test] Launching Chrome in isolated sandbox...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    userDataDir: TEMP_PROFILE_DIR,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // 1. Visit Home (Fresh, unauthenticated session)
    console.log('[E2E Auth Test] 1. Visiting http://localhost:5173/ with zero session state...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Verify Sign In Portal is visible
    const portalTitle = await page.$eval('h1', (el) => el.textContent.trim());
    console.log(`[E2E Auth Test] Auth portal detected: "${portalTitle}"`);
    if (portalTitle !== 'INDRA') {
      throw new Error(`Expected 'INDRA' portal header, found '${portalTitle}'`);
    }

    // Verify NO Judge Quick-Login buttons exist
    const buttonTexts = await page.$$eval('button', (btns) => btns.map((b) => b.innerText || ''));
    const quickLoginButtons = buttonTexts.filter((t) => /judge|quick-login|switch to/i.test(t));
    console.log(`[E2E Auth Test] Quick-login buttons found: ${quickLoginButtons.length} (must be 0)`);
    if (quickLoginButtons.length > 0) {
      throw new Error('Violation: Visible Quick-Login buttons detected on citizen portal!');
    }

    // Capture Sign In Portal Screenshot
    const signinPath = path.join(ARTIFACT_DIR, 'auth_01_portal_signin.png');
    await page.screenshot({ path: signinPath, fullPage: true });
    console.log(`[E2E Auth Test] Saved: ${signinPath}`);

    // 2. Switch to Create Citizen Account tab
    console.log('[E2E Auth Test] 2. Inspecting Create Citizen Account tab...');
    const signupTab = await page.$('button::-p-text("Create Citizen Account")');
    if (signupTab) {
      await signupTab.click();
      await sleep(600);
      const signupPath = path.join(ARTIFACT_DIR, 'auth_02_portal_signup.png');
      await page.screenshot({ path: signupPath, fullPage: true });
      console.log(`[E2E Auth Test] Saved: ${signupPath}`);
    }

    // 3. Switch back to Sign In
    console.log('[E2E Auth Test] 3. Signing in as Aarav Patel (aarav.patel@example.in)...');
    const signinTab = await page.$('button::-p-text("Sign In")');
    if (signinTab) {
      await signinTab.click();
      await sleep(400);
    }

    // Type credentials
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');

    await emailInput.click({ clickCount: 3 });
    await emailInput.type('aarav.patel@example.in');

    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type('Password123!');

    // Submit form
    const submitButton = await page.$('button[type="submit"]');
    await submitButton.click();

    // Wait for workspace / dashboard to load
    console.log('[E2E Auth Test] Waiting for authenticated workspace to load...');
    await page.waitForSelector('header', { timeout: 10000 });
    await sleep(2500);

    // Verify Aarav Patel identity in Header
    const headerText = await page.$eval('header', (el) => el.innerText);
    console.log('[E2E Auth Test] Header text snippet:', headerText.slice(0, 150).replace(/\n/g, ' '));
    if (!headerText.includes('Aarav Patel')) {
      throw new Error("Expected 'Aarav Patel' in authenticated header!");
    }

    // Capture Authenticated Aarav Homepage
    const aaravPath = path.join(ARTIFACT_DIR, 'auth_03_aarav_logged_in.png');
    await page.screenshot({ path: aaravPath, fullPage: true });
    console.log(`[E2E Auth Test] Saved: ${aaravPath}`);

    // 4. Inspect Profile Menu (Verify NO Persona Switcher)
    console.log('[E2E Auth Test] 4. Opening profile menu...');
    const profileBtn = await page.$('header button[title="Citizen Account"]');
    if (profileBtn) {
      await profileBtn.click();
      await sleep(600);

      // Verify profile menu contents
      const profileMenuText = await page.$eval('header', (el) => el.innerText);
      if (!profileMenuText.includes('Verified Citizen')) {
        throw new Error("Expected 'Verified Citizen' badge in profile menu!");
      }
      if (!profileMenuText.includes('Secure session active')) {
        throw new Error("Expected 'Secure session active' indicator in profile menu!");
      }
      if (!profileMenuText.includes('Log Out')) {
        throw new Error("Expected 'Log Out' button in profile menu!");
      }
      if (profileMenuText.includes('Switch Profile') || profileMenuText.includes('Priya Sharma')) {
        throw new Error("Violation: Persona switcher or other citizens found in authenticated profile menu!");
      }

      const menuPath = path.join(ARTIFACT_DIR, 'auth_04_profile_menu.png');
      await page.screenshot({ path: menuPath, fullPage: true });
      console.log(`[E2E Auth Test] Saved: ${menuPath}`);

      // 5. Click Log Out
      console.log('[E2E Auth Test] 5. Clicking Log Out...');
      const logoutBtn = await page.$('button::-p-text("Log Out")');
      if (logoutBtn) {
        await logoutBtn.click();
        await sleep(1500);

        // Verify returned to Auth Portal
        const loggedOutTitle = await page.$eval('h1', (el) => el.textContent.trim());
        if (loggedOutTitle !== 'INDRA') {
          throw new Error('Expected return to INDRA Auth Portal after logout!');
        }

        const logoutPath = path.join(ARTIFACT_DIR, 'auth_05_logged_out.png');
        await page.screenshot({ path: logoutPath, fullPage: true });
        console.log(`[E2E Auth Test] Saved: ${logoutPath}`);
      }
    }

    console.log('\n=============================================');
    console.log('✅ ALL CITIZEN AUTHENTICATION & E2E CHECKS PASSED!');
    console.log('=============================================\n');
  } finally {
    await browser.close();
    try {
      fs.rmSync(TEMP_PROFILE_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error('[E2E Auth Test ERROR]', err);
  process.exit(1);
});
