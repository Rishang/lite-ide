#!/usr/bin/env node
// Bundles @types/node and @types/react .d.ts files into a JSON file for Monaco addExtraLib
const fs = require('fs');
const path = require('path');

const nodeTypesDir = path.join(__dirname, '../node_modules/@types/node');
const reactTypesDir = path.join(__dirname, '../node_modules/@types/react');

// Resolve symlinks
const resolveDir = (dir) => {
  try { return fs.realpathSync(dir); } catch { return dir; }
};

const nodeDir = resolveDir(nodeTypesDir);
const reactDir = resolveDir(reactTypesDir);

// Key Node.js modules to include
const nodeFiles = [
  'globals.d.ts', 'console.d.ts', 'process.d.ts', 'path.d.ts', 'fs.d.ts',
  'fs/promises.d.ts', 'http.d.ts', 'https.d.ts', 'os.d.ts', 'events.d.ts',
  'stream.d.ts', 'buffer.d.ts', 'url.d.ts', 'util.d.ts', 'child_process.d.ts',
  'net.d.ts', 'timers.d.ts', 'crypto.d.ts',
];

const libs = [];

// Add Node.js types
for (const file of nodeFiles) {
  const filePath = path.join(nodeDir, file);
  if (fs.existsSync(filePath)) {
    libs.push({
      path: `file:///node_modules/@types/node/${file}`,
      content: fs.readFileSync(filePath, 'utf8'),
    });
  }
}

// Add React types (just the main index)
const reactIndex = path.join(reactDir, 'index.d.ts');
if (fs.existsSync(reactIndex)) {
  libs.push({
    path: 'file:///node_modules/@types/react/index.d.ts',
    content: fs.readFileSync(reactIndex, 'utf8'),
  });
}

// Global type for React JSX
const reactGlobal = path.join(reactDir, 'global.d.ts');
if (fs.existsSync(reactGlobal)) {
  libs.push({
    path: 'file:///node_modules/@types/react/global.d.ts',
    content: fs.readFileSync(reactGlobal, 'utf8'),
  });
}

const outDir = path.join(__dirname, '../public');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'types.json'), JSON.stringify(libs));
console.log(`Generated types.json with ${libs.length} files (${(Buffer.byteLength(JSON.stringify(libs)) / 1024).toFixed(0)}KB)`);
