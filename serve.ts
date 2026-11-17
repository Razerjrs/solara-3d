// Minimal static server for local play-testing: serves game/ at
// http://localhost:8080 (headless Chrome blocks localhost navigation, so
// screenshots use file:// instead; this server is for desktop play).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.css': 'text/css',
};

const server = createServer(async (req, res) => {
  const path = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  try {
    const data = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(8080, () => console.log('SOLARA at http://localhost:8080'));
