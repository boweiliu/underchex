#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the current docs.json
const docsJsonPath = path.join(__dirname, '..', 'docs.json');
const docsConfig = JSON.parse(fs.readFileSync(docsJsonPath, 'utf8'));

// Scan docs/docs directory for markdown files
const docsDir = path.join(__dirname, '..', 'docs');
const pages = [];

function scanDirectory(dir, basePath = '') {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath, path.join(basePath, file));
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      // Remove the file extension and add to pages
      const fileName = file.replace(/\.mdx?$/, '');
      // Prepend 'docs/' to the path since files are in docs/docs/
      const pagePath = path.join('docs', basePath, fileName);
      // Convert backslashes to forward slashes for Windows compatibility
      pages.push(pagePath.replace(/\\/g, '/'));
    }
  });
}

scanDirectory(docsDir);

// Sort pages alphabetically
pages.sort();

// Update the navigation
docsConfig.navigation = {
  tabs: [
    {
      tab: 'Documentation',
      groups: [
        {
          group: 'All Pages',
          pages: pages
        }
      ]
    }
  ],
  global: docsConfig.navigation.global
};

// Write back to docs.json
fs.writeFileSync(docsJsonPath, JSON.stringify(docsConfig, null, 2) + '\n');

console.log(`Updated docs.json with ${pages.length} page(s)`);
