const links = require('../../config/links.json');

/**
 * Formats an error message to include support server link
 * @param {string} message - The error message to format
 * @param {Object} options - Options for formatting
 * @param {boolean} options.includeDetails - Whether to include the full error details (default: true)
 * @returns {string} Formatted error message with support link
 */
function formatErrorMessage(message, options = {}) {
  const { includeDetails = true } = options;
  const supportLink = links?.community?.support || 'https://discord.gg/WmFDeMKvzj';
  
  if (!message) {
    return `❌ Something went wrong. Please try again or join our support server: ${supportLink}`;
  }
  
  // If it's an Error object, extract message
  const errorMsg = message && (message.message || message);
  
  if (includeDetails && errorMsg) {
    return `❌ Error: ${errorMsg}\n\n**Need help?** Join our support server: ${supportLink}`;
  }
  
  return `❌ ${message}\n\n**Need help?** Join our support server: ${supportLink}`;
}

module.exports = formatErrorMessage;
