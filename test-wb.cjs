const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  
  console.log('Navigating to app...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // Wait for sidebar to load and click a whiteboard (or create one)
  console.log('Clicking Whiteboard in sidebar...');
  console.log('Clicking Whiteboard in sidebar...');
  
  await page.evaluate(async () => {
      // Access Dexie DB via window.indexedDB manually or use the exposed window objects if any.
      // Since it's a React app, it might be hard to access the app state.
      // Let's just click the New Page button which has text "New Page"
      const buttons = Array.from(document.querySelectorAll('button'));
      const newPageBtn = buttons.find(b => b.textContent.includes('New Page') || b.innerHTML.includes('lucide-plus') || b.querySelector('svg'));
      if (newPageBtn) newPageBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  // click whiteboard type
  await page.evaluate(() => {
      const wBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Whiteboard'));
      if (wBtn) wBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Enter page title..."]');
      if (input) {
          input.value = 'Test WB';
          input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const createBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create'));
      if (createBtn) createBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Drawing a rectangle...');
  // Click rectangle tool
  const rectTool = await page.$('button[title="Rectangle (R)"]');
  if (rectTool) await rectTool.click();
  
  // Draw on canvas
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 200);
  await page.mouse.up();
  
  console.log('Rectangle drawn. Waiting 500ms...');
  await new Promise(r => setTimeout(r, 500));
  
  console.log('Navigating to a different page (Getting Started)...');
  const docButton = await page.$('button:has(svg.lucide-file-text)');
  if (docButton) await docButton.click();
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Navigating back to Whiteboard...');
  wbButton = await page.$('button:has(svg.lucide-square)');
  if (wbButton) await wbButton.click();
  
  console.log('Waiting to see if rectangle is visible...');
  await new Promise(r => setTimeout(r, 1500));
  
  await page.screenshot({ path: 'screenshot.png' });
  console.log('Screenshot saved to screenshot.png');
  
  await browser.close();
})();
