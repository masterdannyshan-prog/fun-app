// Local-only static preview with Expo Router's single-page fallback.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const types = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};
http
  .createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (file !== root && !file.startsWith(root + path.sep)) {
        response.writeHead(403).end();
        return;
      }
      let target = file;
      try {
        if (!(await fs.stat(target)).isFile()) target = path.join(root, 'index.html');
      } catch {
        target = path.join(root, 'index.html');
      }
      const contents = await fs.readFile(target);
      response.writeHead(200, {
        'Content-Type': types[path.extname(target)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(contents);
    } catch {
      response.writeHead(500).end('Preview unavailable. Run expo export first.');
    }
  })
  .listen(Number(process.argv[2] || 8082), '127.0.0.1', () =>
    console.log(`Little Days production preview: http://127.0.0.1:${process.argv[2] || 8082}`),
  );
