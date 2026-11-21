/**
 * SHAHRIYAR TOOLS - COMPREHENSIVE PLATFORM AUDIT SCRIPT
 * Audits link integrity, SEO metadata uniqueness, canonical tags, JSON-LD schemas, and asset paths.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const canonicalBase = 'https://tools.shahriyarsojibhasan.top';

const filesToAudit = [
  'index.html',
  'docs/index.html',
  'about/index.html',
  'contact/index.html',
  'privacy/index.html',
  'terms/index.html',
  'passbook/index.html',
  'reunionposter/index.html',
  'image-compressor/index.html',
  'image-converter/index.html',
  'pdf-tools/index.html',
  'qr-code-generator/index.html',
  'word-counter/index.html',
  'json-formatter/index.html',
  'password-generator/index.html',
  'color-palette/index.html',
  'unit-converter/index.html',
  'age-calculator/index.html',
  'invoice-generator/index.html',
  'markdown-editor/index.html',
  'text-case-converter/index.html',
  'duovista-pdf/index.html',
  '404.html'
];

let errors = [];
let warnings = [];
let passCount = 0;

console.log('=== STARTING SHAHRIYAR TOOLS PLATFORM AUDIT ===\n');

// 1. Audit HTML Files Existence & Content
const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();

filesToAudit.forEach(relPath => {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing file: ${relPath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  // Title check
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  if (!titleMatch) {
    errors.push(`${relPath} is missing a <title> tag`);
  } else {
    const title = titleMatch[1].trim();
    if (titles.has(title)) {
      errors.push(`Duplicate title in ${relPath}: "${title}" (first seen in ${titles.get(title)})`);
    } else {
      titles.set(title, relPath);
    }
  }

  // Description check
  const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (!descMatch) {
    warnings.push(`${relPath} is missing a <meta name="description"> tag`);
  } else {
    const desc = descMatch[1].trim();
    if (descriptions.has(desc)) {
      errors.push(`Duplicate description in ${relPath} (first seen in ${descriptions.get(desc)})`);
    } else {
      descriptions.set(desc, relPath);
    }
  }

  // Canonical check
  const canonMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!canonMatch) {
    warnings.push(`${relPath} is missing a canonical <link>`);
  } else {
    const canon = canonMatch[1].trim();
    if (!canon.startsWith(canonicalBase)) {
      errors.push(`${relPath} canonical URL does not match production domain: "${canon}"`);
    }
    if (canonicals.has(canon)) {
      errors.push(`Duplicate canonical URL in ${relPath}: "${canon}"`);
    } else {
      canonicals.set(canon, relPath);
    }
  }

  // Schema.org JSON-LD Validation
  const jsonLdMatches = content.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    jsonLdMatches.forEach((scriptTag, idx) => {
      const jsonRaw = scriptTag.replace(/<\/?script[^>]*>/gi, '').trim();
      try {
        JSON.parse(jsonRaw);
      } catch (err) {
        errors.push(`Invalid JSON-LD syntax in ${relPath} (block #${idx + 1}): ${err.message}`);
      }
    });
  }

  // Relative link verification
  const linkMatches = content.matchAll(/(href|src)=["']([^"']+)["']/gi);
  for (const match of linkMatches) {
    const attr = match[1];
    const val = match[2];

    // Skip absolute, protocol-relative, anchors, mailto, tel, javascript, data URIs
    if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('//') || 
        val.startsWith('#') || val.startsWith('mailto:') || val.startsWith('tel:') || 
        val.startsWith('javascript:') || val.startsWith('data:') || val.includes('${')) {
      continue;
    }

    const cleanVal = val.split('#')[0].split('?')[0];
    if (!cleanVal) continue;

    const fileDir = path.dirname(fullPath);
    let resolved = path.resolve(fileDir, cleanVal);

    // If directory link, check if index.html exists
    if (!fs.existsSync(resolved)) {
      const withIndex = path.join(resolved, 'index.html');
      if (!fs.existsSync(withIndex)) {
        errors.push(`Broken link in ${relPath} (${attr}="${val}") -> ${resolved} not found`);
      }
    }
  }

  passCount++;
});

// 2. Audit Sitemap.xml
const sitemapPath = path.join(rootDir, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  errors.push('sitemap.xml is missing');
} else {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
  if (!sitemapContent.includes('<?xml') || !sitemapContent.includes('<urlset')) {
    errors.push('sitemap.xml is missing XML declaration or urlset');
  }
  filesToAudit.forEach(file => {
    if (file === '404.html') return; // 404 pages must not be included in sitemap.xml
    let expectedUrl = canonicalBase + '/' + (file === 'index.html' ? '' : file.replace('/index.html', '/'));
    if (!sitemapContent.includes(expectedUrl)) {
      warnings.push(`sitemap.xml missing entry for: ${expectedUrl}`);
    }
  });
}

// 3. Audit Robots.txt
const robotsPath = path.join(rootDir, 'robots.txt');
if (!fs.existsSync(robotsPath)) {
  errors.push('robots.txt is missing');
} else {
  const robotsContent = fs.readFileSync(robotsPath, 'utf8');
  if (!robotsContent.includes('Sitemap: https://tools.shahriyarsojibhasan.top/sitemap.xml')) {
    warnings.push('robots.txt does not link to canonical sitemap.xml');
  }
}

// 4. Audit llms.txt
const llmsPath = path.join(rootDir, 'llms.txt');
if (!fs.existsSync(llmsPath)) {
  errors.push('llms.txt is missing');
}

// Summary Report
console.log(`\n=== AUDIT RESULTS ===`);
console.log(`Files Audited: ${passCount} / ${filesToAudit.length}`);
console.log(`Errors Found: ${errors.length}`);
console.log(`Warnings Found: ${warnings.length}`);

if (errors.length > 0) {
  console.log('\n❌ ERRORS:');
  errors.forEach(e => console.log('  - ' + e));
} else {
  console.log('\n✅ Zero critical errors detected across all files!');
}

if (warnings.length > 0) {
  console.log('\n⚠️ WARNINGS:');
  warnings.forEach(w => console.log('  - ' + w));
}

if (errors.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
