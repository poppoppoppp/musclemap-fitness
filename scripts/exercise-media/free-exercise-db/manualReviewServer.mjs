import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..', '..', '..');
const host = '127.0.0.1';
const port = 4174;
const defaultPage = '/reports/exercise-media/free-exercise-db/manual-review-final-check.html';
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.json', 'application/json; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp'], ['.png', 'image/png'], ['.svg', 'image/svg+xml']
]);

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', `http://${host}:${port}`);
    const pathname = requestUrl.pathname === '/' ? defaultPage : decodeURIComponent(requestUrl.pathname);
    const target = path.resolve(projectRoot, `.${pathname}`);
    if (target !== projectRoot && !target.startsWith(`${projectRoot}${path.sep}`)) return send(response, 403, 'Forbidden');
    const metadata = await stat(target);
    if (metadata.isDirectory()) {
      const entries = (await readdir(target, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
      const links = entries.map((entry) => `<li><a href="${encodeURIComponent(entry.name)}${entry.isDirectory() ? '/' : ''}">${escapeHtml(entry.name)}${entry.isDirectory() ? '/' : ''}</a></li>`).join('');
      return send(response, 200, `<!doctype html><meta charset="utf-8"><title>${escapeHtml(pathname)}</title><h1>${escapeHtml(pathname)}</h1><ul>${links}</ul>`, 'text/html; charset=utf-8');
    }
    response.writeHead(200, { 'Content-Type': contentTypes.get(path.extname(target).toLowerCase()) ?? 'application/octet-stream', 'Content-Length': metadata.size, 'Cache-Control': 'no-cache' });
    createReadStream(target).pipe(response);
  } catch (error) {
    if (error?.code === 'ENOENT') return send(response, 404, 'Not Found');
    send(response, 500, error instanceof Error ? error.message : String(error));
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`端口 ${port} 已被占用；不会静默更换端口。`);
  else console.error(error);
  process.exitCode = 1;
});
server.listen(port, host, () => console.log(`人工审核页: http://${host}:${port}${defaultPage}`));

function send(response, status, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
  response.end(body);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
