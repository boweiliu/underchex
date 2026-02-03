#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'docs');

/**
 * Convert wikilinks to Mintlify-compatible markdown links
 * Examples:
 * - [[Note Title]] -> [Note Title](/docs/note_title)
 * - [[Note Title]] (nb 6) -> [Note Title](/docs/note_title)
 */
function cleanWikilinks(content) {
  // Match wikilinks with optional (nb X) suffix
  const wikilinkPattern = /\[\[([^\]]+)\]\](?:\s*\(nb\s+[\w/.]+\))?/g;

  return content.replace(wikilinkPattern, (match, linkText) => {
    // Convert title to slug (lowercase, replace spaces and special chars with underscores)
    const slug = linkText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return `[${linkText}](/docs/${slug})`;
  });
}


/**
 * Process a single markdown file
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  let cleaned = content;
  cleaned = cleanWikilinks(cleaned);

  if (cleaned !== content) {
    fs.writeFileSync(filePath, cleaned);
    return true;
  }

  return false;
}

/**
 * Process all markdown files in the docs directory
 */
function processAllFiles(dir) {
  let processedCount = 0;

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processedCount += processAllFiles(fullPath);
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      if (processFile(fullPath)) {
        console.log(`Cleaned: ${file}`);
        processedCount++;
      }
    }
  });

  return processedCount;
}

// Run the cleaning
if (!fs.existsSync(docsDir)) {
  console.log(`Directory ${docsDir} does not exist. Skipping.`);
  process.exit(0);
}

const count = processAllFiles(docsDir);
console.log(`\nCleaning complete: ${count} file(s) processed`);
