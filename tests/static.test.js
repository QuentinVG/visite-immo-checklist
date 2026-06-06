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
