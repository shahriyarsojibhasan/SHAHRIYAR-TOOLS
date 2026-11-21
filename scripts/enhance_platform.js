const fs = require('fs');
const path = require('path');

// 1. Vector Favicon Data URI
const VECTOR_FAVICON = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23dc2626'/><path d='M9 12h14v12H9z' fill='none' stroke='white' stroke-width='2'/><path d='M13 12V9a3 3 0 0 1 6 0v3' fill='none' stroke='white' stroke-width='2'/></svg>`;

// 2. Find all index.html files
function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git') continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getHtmlFiles(full));
    } else if (file === 'index.html') {
      results.push(full);
    }
  }
  return results;
}

const files = getHtmlFiles('.');
console.log(`Found ${files.length} HTML files to inspect and upgrade.`);

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const isRoot = file === 'index.html';
  const prefix = isRoot ? '' : '../';

  let changed = false;

  // 1. Fix X/Twitter handle to x.com/shahriyarsojib_
  if (content.includes('x.com/shahriyarsojibhasan') || content.includes('twitter.com/shahriyarsojibhasan')) {
    content = content.replace(/https:\/\/(x|twitter)\.com\/shahriyarsojibhasan/g, 'https://x.com/shahriyarsojib_');
    changed = true;
  }
  if (content.includes('@shahriyarsojibhasan')) {
    content = content.replace(/@shahriyarsojibhasan/g, '@shahriyarsojib_');
    changed = true;
  }

  // 2. Fix Gmail to brand main hello@shahriyarsojibhasan.top
  if (content.includes('shahriyarsojibhasan@gmail.com')) {
    content = content.replace(/shahriyarsojibhasan@gmail\.com/g, 'hello@shahriyarsojibhasan.top');
    changed = true;
  }

  // 3. Fix vector favicon (replace emoji favicons)
  const faviconRegex = /<link\s+rel=["']icon["'][^>]*>/i;
  const newFaviconTag = `<link rel="icon" href="${VECTOR_FAVICON}">`;
  if (faviconRegex.test(content)) {
    content = content.replace(faviconRegex, newFaviconTag);
    changed = true;
  }

  // 4. Ensure .mobile-nav exists inside <header> if not present
  if (content.includes('class="site-header"') && !content.includes('class="mobile-nav"')) {
    const mobileNavMarkup = `
    <div class="mobile-nav" aria-label="Mobile Navigation">
      <ul class="mobile-nav-links">
        <li><a href="${prefix}" class="mobile-nav-link"><i class="fas fa-home"></i> Home</a></li>
        <li><a href="${prefix}#tools-directory" class="mobile-nav-link"><i class="fas fa-th"></i> All Tools Directory</a></li>
        <li><a href="${prefix}docs/" class="mobile-nav-link"><i class="fas fa-book"></i> Documentation & Guides</a></li>
        <li><a href="${prefix}about/" class="mobile-nav-link"><i class="fas fa-info-circle"></i> About Platform</a></li>
        <li><a href="${prefix}contact/" class="mobile-nav-link"><i class="fas fa-envelope"></i> Contact Developer</a></li>
      </ul>
    </div>
  </header>`;
    content = content.replace('</header>', mobileNavMarkup);
    changed = true;
  }

  // 5. Update footer brand logo in site-footer
  const oldFooterBrandHeading = /<h3><i class=["']fas fa-toolbox["'][^>]*><\/i>\s*SHAHRIYAR TOOLS<\/h3>/g;
  const newFooterBrandHeading = `<a href="${prefix}" class="brand-link" style="color: white; margin-bottom: 0.75rem;">
            <span class="brand-badge"><i class="fas fa-toolbox"></i></span>
            <span class="brand-text">SHAHRIYAR<span style="color: #ef4444;">TOOLS</span></span>
          </a>`;
  if (oldFooterBrandHeading.test(content)) {
    content = content.replace(oldFooterBrandHeading, newFooterBrandHeading);
    changed = true;
  }

  // 6. Ensure Documentation link in footer Information list
  if (content.includes('<h4>Information</h4>') && !content.includes(`href="${prefix}docs/"`) && !content.includes(`href="./docs/"`)) {
    content = content.replace(
      '<h4>Information</h4>\n          <ul>',
      `<h4>Information</h4>\n          <ul>\n            <li><a href="${prefix}docs/">Documentation</a></li>`
    );
    changed = true;
  }

  // 7. Ensure Documentation link in desktop header nav if missing
  if (content.includes('<nav aria-label="Main Navigation">') && !content.includes(`href="${prefix}docs/"`) && !content.includes(`href="./docs/"`)) {
    // Insert Docs before About
    content = content.replace(
      `<li><a href="${prefix}about/" class="nav-link">About</a></li>`,
      `<li><a href="${prefix}docs/" class="nav-link">Docs</a></li>\n          <li><a href="${prefix}about/" class="nav-link">About</a></li>`
    );
    changed = true;
  }

  // 8. Humanize backend/technical text
  if (content.includes('Private PDF-Lib')) {
    content = content.replace(/Private PDF-Lib/g, '100% Private');
    changed = true;
  }
  if (content.includes('ArrayBuffer')) {
    content = content.replace(/ArrayBuffer/g, 'memory buffer');
    changed = true;
  }

  // 9. Remove emojis from general UI elements
  // Replace tool hero badges
  content = content.replace(/🛠️/g, '<i class="fas fa-toolbox"></i>');
  content = content.replace(/🎨/g, '<i class="fas fa-palette"></i>');
  content = content.replace(/📖/g, '<i class="fas fa-book-open"></i>');
  content = content.replace(/📑/g, '<i class="fas fa-columns"></i>');
  content = content.replace(/🖨️/g, '<i class="fas fa-print"></i>');
  content = content.replace(/🏪/g, '<i class="fas fa-store"></i>');
  content = content.replace(/⏳/g, '<i class="fas fa-clock"></i>');
  content = content.replace(/📸/g, '<i class="fas fa-camera"></i>');
  content = content.replace(/🖼️/g, '<i class="fas fa-image"></i>');
  content = content.replace(/✨/g, '<i class="fas fa-sparkles"></i>');
  content = content.replace(/🔒/g, '<i class="fas fa-lock"></i>');
  content = content.replace(/⚡/g, '<i class="fas fa-bolt"></i>');
  content = content.replace(/📱/g, '<i class="fas fa-mobile-alt"></i>');
  content = content.replace(/🚀/g, '<i class="fas fa-rocket"></i>');
  content = content.replace(/💡/g, '<i class="fas fa-lightbulb"></i>');

  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
    modifiedCount++;
  }
});

console.log(`Successfully upgraded ${modifiedCount} files.`);
