/**
 * Shared autocomplete helper.
 *
 * Usage:
 * const autocomplete = require('../utils/autocomplete');
 * // inside command.autocomplete(interaction):
 * return autocomplete(interaction, items, { map: item => ({ name: item.name, value: item.id }) });
 *
 * items: array of arbitrary objects
 * opts.map: function(item) -> { name, value }
 * opts.filterFields: array of fields to match against focused input (optional)
 * opts.max: max results (default 25)
 */
module.exports = require('./discord/autocomplete');
