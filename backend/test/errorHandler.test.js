const test = require('node:test');
const assert = require('node:assert/strict');
const { notFound, errorHandler } = require('../middleware/errorHandler');

function mockResponse() {
  return {
    statusCode: 200,
    headersSent: false,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; }
  };
}

test('unknown API path responds with a JSON 404', () => {
  const res = mockResponse();
  notFound({ path: '/api/unknown' }, res);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, error: '接口不存在' });
});

test('unknown non-API path responds with 404', () => {
  const res = mockResponse();
  notFound({ path: '/missing' }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body, 'Not Found');
});

test('unexpected server errors do not expose internals', () => {
  const original = console.error;
  console.error = () => {};
  try {
    const res = mockResponse();
    errorHandler(new Error('secret SQL content'), {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { success: false, error: '服务器内部错误' });
  } finally {
    console.error = original;
  }
});

test('malformed JSON responds with 400', () => {
  const original = console.error;
  console.error = () => {};
  try {
    const res = mockResponse();
    const err = Object.assign(new SyntaxError('Invalid JSON'), { status: 400, type: 'entity.parse.failed' });
    errorHandler(err, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, '请求 JSON 格式错误');
  } finally {
    console.error = original;
  }
});
