const fs = require('fs');
const path = require('path');
const vm = require('vm');

let totalErrors = 0;
let totalScriptsChecked = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (entry === '.git' || entry === 'node_modules') continue;
    
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (entry.endsWith('.html')) {
      checkHtmlFile(fullPath);
    }
  }
}

function checkHtmlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match, idx = 0;
  
  while ((match = scriptRegex.exec(content)) !== null) {
    idx++;
    const attrs = match[1];
    const code = match[2];
    
    // Ignore JSON-LD and external scripts
    if (attrs.includes('application/ld+json') || attrs.includes('src=')) continue;
    if (!code.trim()) continue;
    
    totalScriptsChecked++;
    try {
      new vm.Script(code, { filename: `${filePath} (inline script #${idx})` });
    } catch (err) {
      totalErrors++;
      console.error(`❌ SYNTAX ERROR in ${filePath} (script #${idx}):`);
      console.error(`   Message: ${err.message}`);
      console.error(`   Stack line: ${err.stack.split('\n')[0]}`);
    }
  }
}

console.log('=== CHECKING ALL HTML INLINE SCRIPTS IN WORKSPACE ===');
scanDir('.');
console.log(`\nChecked ${totalScriptsChecked} inline JavaScript blocks.`);
if (totalErrors === 0) {
  console.log('✅ ALL INLINE JAVASCRIPT BLOCKS ARE 100% VALID SYNTAX!');
} else {
  console.error(`❌ FOUND ${totalErrors} SYNTAX ERRORS!`);
  process.exit(1);
}
