const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const IMAGES_DIR = path.join(ROOT, 'images');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif']);

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypeMap = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif'
  };

  const contentType = contentTypeMap[ext] || 'application/octet-stream';
  const isImage = IMAGE_EXTENSIONS.has(ext);
  const cacheControl = isImage
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl
    });
    res.end(data);
  });
}

function listImages(callback) {
  fs.readdir(IMAGES_DIR, { withFileTypes: true }, (err, items) => {
    if (err) {
      if (err.code === 'ENOENT') {
        callback(null, []);
        return;
      }
      callback(err);
      return;
    }

    const files = items
      .filter((item) => item.isFile())
      .map((item) => item.name)
      .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'ja'));

    callback(null, files);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/images') {
    listImages((err, files) => {
      if (err) {
        sendJson(res, 500, { message: '画像一覧の取得に失敗しました' });
        return;
      }
      sendJson(res, 200, files);
    });
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    sendFile(res, path.join(ROOT, 'index.html'));
    return;
  }

  if (url.pathname.startsWith('/images/')) {
    const fileName = decodeURIComponent(url.pathname.replace('/images/', ''));
    const safePath = path.normalize(fileName).replace(/^([.][.][\\/])+/, '');
    sendFile(res, path.join(IMAGES_DIR, safePath));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
