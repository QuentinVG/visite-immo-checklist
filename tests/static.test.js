import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('index references the app assets and has a no-marketing visit shell', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<main id="app"/);
  assert.match(html, /styles\.css/);
  assert.match(html, /app\.js/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /Copier pour ChatGPT/);
});

test('stylesheet includes mobile controls and print support', () => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.step-button/);
  assert.match(css, /\.choice-grid/);
  assert.match(css, /@media print/);
});

test('service worker caches every static app asset', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  for (const asset of ['index.html', 'styles.css', 'app.js', 'data.js', 'logic.js', 'manifest.webmanifest']) {
    assert.match(sw, new RegExp(asset.replace('.', '\\.')));
  }
});

test('README documents local-only storage and GitHub Pages usage', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

  assert.match(readme, /GitHub Pages/);
  assert.match(readme, /localStorage/);
  assert.match(readme, /Copier pour ChatGPT/);
});
