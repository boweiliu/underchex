#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Source and destination directories
const sourceDir = path.join(__dirname, '..', '..', '.nb_docs_repo', 'home');
const destDir = path.join(__dirname, '..', 'docs');

// Track files we've seen to prevent duplicates
const seenFiles = new Set();
let copiedCount = 0;
let skippedCount = 0;

function syncMarkdownFiles(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) {
    console.log(`Source directory ${srcDir} does not exist. Skipping.`);
    return;
  }

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dstDir)) {
    fs.mkdirSync(dstDir, { recursive: true });
  }

  const files = fs.readdirSync(srcDir);

  files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      // Recursively process subdirectories
      const newDstDir = path.join(dstDir, file);
      syncMarkdownFiles(srcPath, newDstDir);
    } else if (file.endsWith('.md')) {
      const fileName = file.toLowerCase();

      // Check for duplicates (case-insensitive)
      if (seenFiles.has(fileName)) {
        console.log(`Skipping duplicate: ${file}`);
        skippedCount++;
        return;
      }

      seenFiles.add(fileName);

      const dstPath = path.join(dstDir, file);

      // Copy the file
      fs.copyFileSync(srcPath, dstPath);
      copiedCount++;
      console.log(`Copied: ${file}`);
    }
  });
}

// Clear the destination directory first
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

// Sync files
syncMarkdownFiles(sourceDir, destDir);

console.log(`\nSync complete: ${copiedCount} file(s) copied, ${skippedCount} duplicate(s) skipped`);
