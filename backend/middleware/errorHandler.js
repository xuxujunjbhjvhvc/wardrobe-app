// Unified Express 404 and error responses.
function notFound(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: '接口不存在' });
  }
  return res.status(404).send('Not Found');
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const rawStatus = err.statusCode ?? err.status;
  const status = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
    ? rawStatus
    : 500;

  console.error('[server error]', err);
  // Do not expose internal SQL errors, stack traces, or file paths to clients.
  const error = status >= 500
    ? '服务器内部错误'
    : (err.type === 'entity.parse.failed' ? '请求 JSON 格式错误' : '请求失败');
  return res.status(status).json({ success: false, error });
}

module.exports = { notFound, errorHandler };
