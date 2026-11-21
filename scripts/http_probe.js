const http = require('http');
const fs = require('fs');
const path = require('path');

const endpoints = [
  '/',
  '/docs/',
  '/about/',
  '/contact/',
  '/privacy/',
  '/terms/',
  '/passbook/',
  '/reunionposter/',
  '/image-compressor/',
  '/image-converter/',
  '/pdf-tools/',
  '/qr-code-generator/',
  '/word-counter/',
  '/json-formatter/',
  '/password-generator/',
  '/color-palette/',
  '/unit-converter/',
  '/age-calculator/',
  '/invoice-generator/',
  '/markdown-editor/',
  '/text-case-converter/',
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
  '/manifest.webmanifest',
  '/assets/css/common.css',
  '/assets/js/common.js'
];

// Simple static server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath.endsWith('/')) {
    reqPath += 'index.html';
  }
  const rootDir = path.resolve(__dirname, '..');
  const filePath = path.join(rootDir, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    let contentType = 'text/html';
    if (filePath.endsWith('.css')) contentType = 'text/css';
    if (filePath.endsWith('.js')) contentType = 'application/javascript';
    if (filePath.endsWith('.xml')) contentType = 'application/xml';
    if (filePath.endsWith('.txt')) contentType = 'text/plain';
    if (filePath.endsWith('.json') || filePath.endsWith('.webmanifest')) contentType = 'application/json';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(4567, async () => {
  console.log('Test server listening on http://localhost:4567');

  let failed = 0;
  for (const ep of endpoints) {
    await new Promise((resolve) => {
      http.get(`http://localhost:4567${ep}`, (res) => {
        if (res.statusCode === 200) {
          console.log(`  [200 OK] ${ep}`);
        } else {
          console.error(`  [${res.statusCode} FAILED] ${ep}`);
          failed++;
        }
        resolve();
      }).on('error', (err) => {
        console.error(`  [ERROR] ${ep}: ${err.message}`);
        failed++;
        resolve();
      });
    });
  }

  server.close();
  console.log(`\nHTTP Probe Completed. Total: ${endpoints.length}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
});
