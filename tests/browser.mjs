// Shared Playwright launcher: uses a preinstalled Chromium if one is available.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const candidates = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);

export async function launch() {
  const executablePath = candidates.find((p) => fs.existsSync(p));
  return chromium.launch({
    executablePath,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
}
