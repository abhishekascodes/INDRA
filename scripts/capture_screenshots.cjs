const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\AbhishekPC\\.gemini\\antigravity\\brain\\0fc6c9f4-e1e2-4378-88e2-ff080e0571d8';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = 'C:\\Users\\AbhishekPC\\AppData\\Local\\Temp\\chrome-capture-profile';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Spawning Chrome...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--window-size=1600,1200',
    `--user-data-dir=${TEMP_DIR}`,
    'http://127.0.0.1:5173',
  ]);

  let pageWsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const targets = await fetchJson('http://127.0.0.1:9222/json');
      const page = targets.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        pageWsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!pageWsUrl) {
    console.error('Could not find Chrome page target');
    chrome.kill();
    process.exit(1);
  }

  console.log('Connected to CDP at', pageWsUrl);
  const ws = new WebSocket(pageWsUrl);

  let idCounter = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  await new Promise((resolve) => (ws.onopen = resolve));

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = idCounter++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });

  console.log('Waiting for initial dashboard render...');
  await sleep(4000); // Allow initial data fetch

  async function capture(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.result.data, 'base64');
    const outPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
  }

  // 1. Home Dashboard
  await capture('screenshot_dashboard_home.png');

  // 2. Click Persona Switcher Dropdown
  await send('Runtime.evaluate', {
    expression: `
      const btn = document.querySelector('button[title="Switch Synthetic Citizen Persona"]');
      if (btn) btn.click();
    `,
  });
  await sleep(500);
  await capture('screenshot_persona_dropdown.png');

  // Close dropdown by clicking header logo
  await send('Runtime.evaluate', {
    expression: `
      const logo = document.querySelector('header div');
      if (logo) logo.click();
    `,
  });
  await sleep(400);

  // 3. Public Record Tab
  await send('Runtime.evaluate', {
    expression: `
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const tab = tabs.find(b => b.textContent.includes('Public Record'));
      if (tab) tab.click();
    `,
  });
  await sleep(1500);
  await capture('screenshot_public_record.png');

  // 4. Action Plans Tab
  await send('Runtime.evaluate', {
    expression: `
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const tab = tabs.find(b => b.textContent.includes('Action Plans'));
      if (tab) tab.click();
    `,
  });
  await sleep(1500);
  await capture('screenshot_action_plans.png');

  // 5. Inbox / Action Center Tab
  await send('Runtime.evaluate', {
    expression: `
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const tab = tabs.find(b => b.textContent.includes('Inbox'));
      if (tab) tab.click();
    `,
  });
  await sleep(1500);
  await capture('screenshot_action_center.png');

  // 6. Vault Tab
  await send('Runtime.evaluate', {
    expression: `
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const tab = tabs.find(b => b.textContent.includes('Vault'));
      if (tab) tab.click();
    `,
  });
  await sleep(1000);
  await capture('screenshot_vault.png');

  ws.close();
  chrome.kill();
  console.log('Done capturing all screenshots!');
}

run().catch((err) => {
  console.error('Error running capture:', err);
  process.exit(1);
});
