const fs = require('fs');
const path = require('path');
const lockFile = path.join(__dirname, '../auth_info_baileys/.instance.lock');
function isOurProcess(pid) {
  try {
    process.kill(pid, 0); // throws if dead
  } catch {
    return false; // dead process — stale lock
  }
  try {
    const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8')
      .replace(/\0/g, ' ')
      .trim();
    // Must be node AND running index.js — rules out Pterodactyl daemon (PID 27)
    return /\bnode\b/i.test(cmdline) && cmdline.includes('index.js');
  } catch {
    return false; // /proc unreadable — treat as not ours
  }
}
async function acquireLock() {
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  
  const maxRetries = 5;
  const retryDelay = 2000;

  for (let i = 0; i < maxRetries; i++) {
    if (fs.existsSync(lockFile)) {
      const oldPid = Number(fs.readFileSync(lockFile, 'utf8').trim());
      
      if (oldPid === process.pid || !isOurProcess(oldPid)) {
        console.warn(`[instanceLock] ⚠️ Stale lock (PID ${oldPid}). Replacing.`);
        try { fs.unlinkSync(lockFile); } catch (e) {}
        break;
      } else if (isOurProcess(oldPid)) {
        console.log(`[instanceLock] ⏳ Old instance (PID ${oldPid}) is still running... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    } else {
      break;
    }
  }

  if (fs.existsSync(lockFile)) {
    const oldPid = Number(fs.readFileSync(lockFile, 'utf8').trim());
    if (isOurProcess(oldPid) && oldPid !== process.pid) {
      console.error(`[instanceLock] ❌ Another MESH-TECH-MD instance is still running (PID ${oldPid}). Exiting.`);
      process.exit(1);
    }
  }

  fs.writeFileSync(lockFile, process.pid.toString());
  console.log(`[instanceLock] ✅ Lock acquired (PID ${process.pid})`);
}
function releaseLock() {
  try {
    if (
      fs.existsSync(lockFile) &&
      fs.readFileSync(lockFile, 'utf8').trim() === String(process.pid)
    ) {
      fs.unlinkSync(lockFile);
      console.log('[instanceLock] 🔓 Lock released.');
    }
  } catch {}
}
module.exports = { acquireLock, releaseLock };
