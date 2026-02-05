#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the current docs.json
const docsJsonPath = path.join(__dirname, '..', 'docs.json');
const docsConfig = JSON.parse(fs.readFileSync(docsJsonPath, 'utf8'));

// Scan root directory for markdown files
const docsDir = path.join(__dirname, '..');
const pages = [];

// Directories to skip
const skipDirs = ['scripts', '.github', 'node_modules', '.nb_docs_repo', '.git', 'logo', 'images', 'snippets'];

function scanDirectory(dir, basePath = '') {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip infrastructure and asset directories
      if (basePath === '' && skipDirs.includes(file)) {
        return;
      }
      scanDirectory(fullPath, path.join(basePath, file));
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      // Remove the file extension and add to pages
      const fileName = file.replace(/\.mdx?$/, '');
      // Build the path from basePath and fileName
      const pagePath = basePath ? path.join(basePath, fileName) : fileName;
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
