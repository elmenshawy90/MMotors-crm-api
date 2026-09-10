
/** @type {Map<string, number>} token → expiry timestamp (ms) */
const blacklist = new Map();

/**
 *  token  
 * @param {string} token —  JWT  
 * @param {number} expiresAt — Unix timestamp   decoded.exp
 */
export function blacklistToken(token, expiresAt) {
  blacklist.set(token, expiresAt * 1000); 
}

/**
 * @param {string} token
 * @returns {boolean}
 */
export function isBlacklisted(token) {
  return blacklist.has(token);
}

/**
 */
function cleanup() {
  const now = Date.now();
  for (const [token, expiry] of blacklist.entries()) {
    if (expiry < now) {
      blacklist.delete(token);
    }
  }
}

setInterval(cleanup, 15 * 60 * 1000);
