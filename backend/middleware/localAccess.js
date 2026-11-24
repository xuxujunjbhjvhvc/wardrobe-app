const net = require('node:net');

function listenHost(value = '') {
  const host = String(value || '').trim();
  if (!host) return '127.0.0.1';
  if (['127.0.0.1', '::1', '0.0.0.0', '::'].includes(host)) return host;
  throw new Error('HOST 必须是 127.0.0.1、::1、0.0.0.0 或 ::');
}

// Block DNS rebinding and cross-site browser mutations, even on loopback.
// In opt-in LAN mode the Host header must match the actual local interface IP.
function localAccess(req, res, next) {
  const rawHost = req.headers.host;
  if (typeof rawHost !== 'string' || !rawHost || /[@/\s,\\]/.test(rawHost)) {
    return res.status(403).json({ success: false, error: '不允许的访问地址' });
  }

  let target;
  try {
    target = new URL('http://' + rawHost);
  } catch {
    return res.status(403).json({ success: false, error: '不允许的访问地址' });
  }

  const host = target.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const localIP = String(req.socket?.localAddress || '').toLowerCase()
    .replace(/^::ffff:/, '');
  const loopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const interfaceIP = net.isIP(host) !== 0 && host === localIP;
  if (!loopback && !interfaceIP) {
    return res.status(403).json({ success: false, error: '不允许的访问地址' });
  }

  const originHeader = req.headers.origin;
  if (originHeader) {
    let origin;
    try { origin = new URL(originHeader); } catch { /* rejected below */ }
    if (!origin || !['http:', 'https:'].includes(origin.protocol) ||
        origin.host.toLowerCase() !== target.host.toLowerCase()) {
      return res.status(403).json({ success: false, error: '禁止跨站请求' });
    }
  } else if (req.headers['sec-fetch-site'] === 'cross-site') {
    return res.status(403).json({ success: false, error: '禁止跨站请求' });
  }
  next();
}

module.exports = { listenHost, localAccess };
