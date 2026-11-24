const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');

/**
 * Write a complete database image without truncating the previous file.
 * The temporary file is created in the destination directory so rename
 * can replace the old image atomically on the same filesystem.
 */
function writeAtomically(filePath, data, io = fs) {
  const tempPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
  );
  let fd;
  try {
    fd = io.openSync(tempPath, 'wx', 0o600);
    io.writeFileSync(fd, data);
    io.fsyncSync(fd);
    io.closeSync(fd);
    fd = undefined;
    io.renameSync(tempPath, filePath);
  } catch (error) {
    if (fd !== undefined) {
      try { io.closeSync(fd); } catch (_) { /* preserve original error */ }
    }
    try { io.unlinkSync(tempPath); } catch (_) { /* best-effort cleanup */ }
    throw error;
  }
}

module.exports = { writeAtomically };
