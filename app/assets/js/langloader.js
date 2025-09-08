const fs = require('fs-extra')
const path = require('path')
const toml = require('toml')
const merge = require('lodash.merge')

let lang

exports.loadLanguage = function(id){
    lang = merge(lang || {}, toml.parse(fs.readFileSync(path.join(__dirname, '..', 'lang', `${id}.toml`))) || {})
}

exports.query = function(id, placeHolders){
    let query = id.split('.')
    let res = lang
    for(let q of query){
        res = res[q]
    }
    let text = res === lang ? '' : res
    if (placeHolders) {
        Object.entries(placeHolders).forEach(([key, value]) => {
            text = text.replace(`{${key}}`, value)
        })
    }
    return text
}

exports.queryJS = function(id, placeHolders){
    return exports.query(`js.${id}`, placeHolders)
}

exports.queryEJS = function(id, placeHolders){
    return exports.query(`ejs.${id}`, placeHolders)
}

exports.setupLanguage = function(){
    const ConfigManager = require('./configmanager')
    
    // Get user's language preference only if config is loaded
    let userLanguage = null
    if(ConfigManager.isLoaded()) {
        userLanguage = ConfigManager.getLanguage()
    }
    
    // Detect system language
    const systemLang = detectSystemLanguage()
    
    // Use user preference if set, otherwise auto-detect
    const targetLang = userLanguage || systemLang
    
    // Load Language Files
    exports.loadLanguage('en_US')
    
    // Load target language if available and not English
    if(targetLang !== 'en_US') {
        exports.loadLanguage(targetLang)
    }

    // Load Custom Language File for Launcher Customizer
    exports.loadLanguage('_custom')
}

function detectSystemLanguage(){
    // Get system language from various sources
    let lang = process.env.LANG || 
               process.env.LANGUAGE || 
               process.env.LC_ALL || 
               process.env.LC_MESSAGES ||
               'en_US'
    
    // Try to get from Intl API
    try {
        const intlLang = Intl.DateTimeFormat().resolvedOptions().locale
        if(intlLang) {
            lang = intlLang
        }
    } catch(e) {
        // Ignore errors
    }
    
    // Try to get from navigator (if available in renderer process)
    try {
        if(typeof navigator !== 'undefined' && navigator.language) {
            lang = navigator.language
        }
    } catch(e) {
        // Ignore errors
    }
    
    // Extract language code (e.g., 'ru_RU' from 'ru_RU.UTF-8' or 'ru' from 'ru-RU')
    let langCode = lang.split('.')[0].split('_')[0].split('-')[0]
    
    // Map common language codes to our supported languages
    const supportedLanguages = {
        'ru': 'ru_RU',
        'en': 'en_US',
        'es': 'es_ES'
    }
    
    return supportedLanguages[langCode] || 'en_US'
}

exports.setLanguage = function(languageId){
    // Clear current language data
    lang = {}
    
    // Load base English first
    exports.loadLanguage('en_US')
    
    // Load selected language if it exists and is not English
    if(languageId && languageId !== 'en_US') {
        exports.loadLanguage(languageId)
    }
    
    // Always load custom translations last
    exports.loadLanguage('_custom')
}
