/**
 * Sanitasi string input pencarian agar aman digunakan dalam query PostgREST/Supabase.
 * Mencegah PostgREST filter injection, wildcard abuse, dan malformed syntax query.
 *
 * @param {any} input
 * @param {number} maxLength
 * @returns {string}
 */
const sanitizeSearch = (input, maxLength = 80) => {
  if (input === undefined || input === null) return '';
  const str = String(input);

  return str
    .replace(/[\x00-\x1F\x7F]/g, '')           // Strip control characters
    .replace(/[(),.%\\'"`;*$^<>{}|[\]:]/g, ' ')  // Strip syntax chars & wildcards
    .replace(/\s+/g, ' ')                      // Condense spaces
    .trim()
    .slice(0, maxLength);
};

module.exports = {
  sanitizeSearch
};
