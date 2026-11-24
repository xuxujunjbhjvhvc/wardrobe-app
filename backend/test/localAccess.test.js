const test = require('node:test');
const assert = require('node:assert/strict');
const { listenHost, localAccess } = require('../middleware/localAccess');

function request(host, origin, localAddress = '127.0.0.1', site = undefined) {
  const headers = { host };
  if (origin !== undefined) headers.origin = origin;
  if (site !== undefined) headers['sec-fetch-site'] = site;
  return { headers, method: 'POST', socket: { localAddress } };
}
function check(req) {
  const result = { statusCode: 200, next: false, message: null };
  const response = {
    status(status) { result.statusCode = status; return this; },
    json(body) { result.message = body; return this; }
  };
  localAccess(req, response, () => { result.next = true; });
  return result;
}

test('binds loopback by default; explicit LAN opt-in only', () => {
  assert.equal(listenHost(), '127.0.0.1');
  assert.equal(listenHost('0.0.0.0'), '0.0.0.0');
  assert.equal(listenHost('::'), '::');
  assert.throws(() => listenHost('public.example'), /HOST/);
});
test('accepts normal local app requests', () => {
  assert.equal(check(request('127.0.0.1:3000', 'http://127.0.0.1:3000')).next, true);
  assert.equal(check(request('localhost:3000', undefined)).next, true);
});
test('rejects cross-origin posts even when the host is local', () => {
  assert.equal(check(request('127.0.0.1:3000', 'https://attacker.example')).statusCode, 403);
  assert.equal(check(request('127.0.0.1:3000', 'http://127.0.0.1:9090')).statusCode, 403);
  assert.equal(check(request('127.0.0.1:3000', 'null')).statusCode, 403);
  assert.equal(check(request('127.0.0.1:3000', undefined, '127.0.0.1', 'cross-site')).statusCode, 403);
});
test('rejects DNS rebinding and injected host headers', () => {
  assert.equal(check(request('attacker.example:3000', undefined)).statusCode, 403);
  assert.equal(check(request('attacker.example@127.0.0.1:3000')).statusCode, 403);
  assert.equal(check(request('127.0.0.1:3000,attacker.example')).statusCode, 403);
});
test('allows exact local-interface IP in explicit LAN mode only', () => {
  assert.equal(check(request('192.168.1.20:3000', 'http://192.168.1.20:3000', '192.168.1.20')).next, true);
  assert.equal(check(request('192.168.1.20:3000', undefined, '127.0.0.1')).statusCode, 403);
  assert.equal(check(request('192.168.1.21:3000', undefined, '192.168.1.20')).statusCode, 403);
});
