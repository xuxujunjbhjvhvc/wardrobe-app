const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '../../frontend/sw.js'), 'utf8');
function harness(fetchImpl) {
  const listeners = new Map();
  const cached = new Map();
  const cache = {
    add: async () => {},
    put: async (request, response) => { cached.set(request.url || request, response); }
  };
  const caches = {
    open: async () => cache,
    match: async (request) => cached.get(request.url || request),
    keys: async () => ['wardrobe-v1.0.0'],
    delete: async () => true
  };
  const self = {
    location: { origin: 'http://127.0.0.1:3000' },
    addEventListener(type, cb) { listeners.set(type, cb); },
    skipWaiting: async () => {},
    clients: { claim: async () => {} }
  };
  vm.runInNewContext(code, { self, caches, fetch: fetchImpl, URL, Promise }, { timeout: 2000 });
  async function request(url, options = {}) {
    let response;
    const event = {
      request: { url, method: options.method || 'GET', mode: options.mode || 'same-origin' },
      respondWith(promise) { response = promise; }
    };
    listeners.get('fetch')(event);
    return response ? response : null;
  }
  return { request, cached, listeners, caches };
}
const response = text => ({ ok: true, body: text, clone() { return response(text); } });

test('online fetch returns the fresh shell instead of stale cached content', async () => {
  const h = harness(async () => response('new'));
  h.cached.set('http://127.0.0.1:3000/index.html', response('old'));
  const result = await h.request('http://127.0.0.1:3000/index.html');
  assert.equal(result.body, 'new');
});
test('network failure falls back to a cached page', async () => {
  const h = harness(async () => { throw new Error('offline'); });
  h.cached.set('http://127.0.0.1:3000/index.html', response('offline copy'));
  const result = await h.request('http://127.0.0.1:3000/index.html');
  assert.equal(result.body, 'offline copy');
});
test('navigation can fall back to cached index.html', async () => {
  const h = harness(async () => { throw new Error('offline'); });
  h.cached.set('/index.html', response('app shell'));
  const result = await h.request('http://127.0.0.1:3000/wardrobe', {mode:'navigate'});
  assert.equal(result.body, 'app shell');
});
test('API, upload, external origin and mutations are never intercepted', async () => {
  const h = harness(async () => response('should not be used'));
  const paths=['http://127.0.0.1:3000/api/clothing','http://127.0.0.1:3000/uploads/photo.png','https://example.org/script.js'];
  for (const url of paths) assert.equal(await h.request(url), null);
  assert.equal(await h.request('http://127.0.0.1:3000/', {method:'POST'}), null);
});
