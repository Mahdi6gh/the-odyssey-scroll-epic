// Minimal static server: `npm start`, then open http://localhost:5173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT) || 5173;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.json': 'application/json'
};

createServer(async (req, res) => {
  try {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    if (!path || path.endsWith('/') || path.endsWith('\\')) path = join(path, 'index.html');
    const file = join(root, path);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const info = await stat(file);
    const type = types[extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    const data = await readFile(file);
    // byte ranges let the browser seek inside videos and audio
    if (range) {
      const [s, e] = range.replace('bytes=', '').split('-');
      const start = Number(s), end = e ? Number(e) : info.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${info.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      res.end(data.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': info.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log(`The Odyssey is sailing at http://localhost:${port}`));
