/**
 * Initialize SkinManager as global object
 */
const SkinManager = require('./assets/js/skinmanager')

// Make SkinManager globally available
window.SkinManager = SkinManager

// Add debug information
console.log('SkinManager initialized:', window.SkinManager)
