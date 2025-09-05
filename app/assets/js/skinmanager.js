/**
 * SkinManager
 * 
 * Module for managing player skins from different sources.
 * Supports Mojang, Microsoft, and Ely.by skins.
 * 
 * @module skinmanager
 */

/**
 * Get the skin URL for an account
 * 
 * @param {Object} account Account object
 * @param {string} type Skin type ('head', 'body', 'avatar')
 * @param {number} size Image size
 * @returns {Promise<string>} Skin URL
 */

async function getSkinUrl(account, type = 'head', size = 40) {
    if (!account || !account.uuid) {
        return getDefaultSkinUrl(type, size)
    }


    switch (account.type) {
        case 'ely':
            // For Ely.by use username instead of UUID
            if (account.username) {
                const elyUrl = await getElySkinUrlByNickname(account.username, type, size)
                return elyUrl
            } else {
                // Fallback to default skin if username is not available
                return getDefaultSkinUrl(type, size)
            }
        case 'microsoft':
        case 'mojang':
        default:
            const mojangUrl = getMojangSkinUrl(account.uuid, type, size)
            return mojangUrl
    }
}

/**
 * Get skin URL from Mojang/mc-heads
 * 
 * @param {string} uuid Player UUID
 * @param {string} type Skin type
 * @param {number} size Size
 * @returns {string} Skin URL
 */
function getMojangSkinUrl(uuid, type, size) {
    const baseUrl = 'https://mc-heads.net'
    
    switch (type) {
        case 'head':
            return `${baseUrl}/head/${uuid}/${size}`
        case 'body':
            return `${baseUrl}/body/${uuid}/${size}`
        case 'avatar':
            return `${baseUrl}/body/${uuid}/right`
        default:
            return `${baseUrl}/head/${uuid}/${size}`
    }
}

/**
 * Get texture information from Ely.by API
 * 
 * @param {string} username Player nickname
 * @returns {Promise<Object>} Texture information
 */
async function getElyTexturesInfo(username) {
    try {
        
        // Use simple endpoint skinsystem.ely.by
        const response = await fetch(`http://skinsystem.ely.by/profile/${username}`)
        
        if (!response.ok) {
            console.error('SkinManager: Failed to get Ely.by textures info:', response.status)
            return null
        }
        
        const data = await response.json()
        console.log('SkinManager: Ely.by profile info:', data)
        
        // Look for textures property in properties
        if (data.properties && Array.isArray(data.properties)) {
            const texturesProperty = data.properties.find(prop => prop.name === "textures")
            if (texturesProperty) {
                try {
                    // Decode base64 value
                    const decodedValue = JSON.parse(atob(texturesProperty.value))
                    console.log('SkinManager: Decoded textures info:', decodedValue)
                    return decodedValue
                } catch (decodeError) {
                    console.error('SkinManager: Error decoding textures property:', decodeError)
                    return null
                }
            } else {
                console.log('SkinManager: No textures property found in profile')
                return null
            }
        } else {
            console.log('SkinManager: No properties found in profile')
            return null
        }
    } catch (error) {
        console.error('SkinManager: Error getting Ely.by textures info:', error)
        return null
    }
}

/**
 * Get skin URL from Ely.by by nickname
 * 
 * @param {string} nickname Player nickname
 * @param {string} type Skin type
 * @param {number} size Size
 * @returns {Promise<string>} Skin URL
 */
async function getElySkinUrlByNickname(nickname, type, size) {
    console.log('SkinManager: Getting Ely.by skin by nickname:', nickname)
    
    try {
        // Get textures info directly by nickname
        const texturesInfo = await getElyTexturesInfo(nickname)
        
        if (!texturesInfo || !texturesInfo.textures || !texturesInfo.textures.SKIN) {
            console.error('SkinManager: No skin info found for nickname:', nickname)
            return getDefaultSkinUrl(type, size)
        }
        
        // Extract skin URL
        const skinUrl = texturesInfo.textures.SKIN.url
        console.log('SkinManager: Ely.by skin URL:', skinUrl)
        
        // Return original skin URL directly
        return skinUrl
        
    } catch (error) {
        console.error('SkinManager: Error getting Ely.by skin by nickname:', error)
        return getDefaultSkinUrl(type, size)
    }
}


/**
 * Get skin URL from Ely.by by skin hash
 * 
 * @param {string} skinHash Skin hash
 * @param {string} type Skin type
 * @param {number} size Size
 * @returns {string} Skin URL
 */
function getElySkinUrlByHash(skinHash, type, size) {
    // Ely.by uses format: https://ely.by/storage/skins/{hash}.png
    const baseUrl = 'https://ely.by/storage/skins'
    
    switch (type) {
        case 'head':
            return `${baseUrl}/${skinHash}.png`
        case 'body':
            return `${baseUrl}/${skinHash}.png`
        case 'avatar':
            return `${baseUrl}/${skinHash}.png`
        default:
            return `${baseUrl}/${skinHash}.png`
    }
}

/**
 * Check Ely.by API availability
 * 
 * @returns {Promise<boolean>} Whether Ely.by API is available
 */
async function checkElyByAvailability() {
    try {
        const response = await fetch('https://ely.by/storage/skins/test.png', { 
            method: 'HEAD',
            timeout: 5000 // 5 seconds timeout
        })
        return response.ok || response.status === 404 // 404 is also normal for test request
    } catch (error) {
        console.log('SkinManager: Ely.by API unavailable:', error.message)
        return false
    }
}

/**
 * Create URL for displaying only head from skin texture
 * 
 * @param {string} skinUrl Full skin texture URL
 * @param {number} size Head size
 * @returns {string} URL for head display
 */
function createHeadUrl(skinUrl, size = 40) {
    // For Ely.by and other sources that return full texture,
    // we can use CSS to crop the head
    // Head in Minecraft texture is located at coordinates 8,8 with size 8x8 pixels
    // from 64x64 pixel texture
    
    // Create CSS style for head cropping
    const headStyle = `
        background-image: url('${skinUrl}');
        background-size: ${size * 8}px ${size * 8}px;
        background-position: -${size}px -${size}px;
        width: ${size}px;
        height: ${size}px;
        image-rendering: pixelated;
    `
    
    return headStyle
}

/**
 * Update element with cropped player head
 * 
 * @param {HTMLElement} element Element to update
 * @param {Object} account Account object
 * @param {number} size Head size
 */
function updateHeadInElement(element, account, size = 40) {
    if (!element) {
        console.log('SkinManager: No element provided for head update')
        return
    }
    
    // Use async function to get skin URL
    getSkinUrl(account, 'head', size).then(skinUrl => {
        console.log('SkinManager: Updating element with head from skin URL:', skinUrl)
        
        // Apply style for head cropping
        const headStyle = createHeadUrl(skinUrl, size)
        element.style.cssText = headStyle
        
        console.log('SkinManager: Applied head style to element')
        
        // Add error handler for fallback
        element.onerror = () => {
            console.log('SkinManager: Head image failed to load, trying fallback')
            
            // If this is Ely.by skin, try fallback to mc-heads.net
            if (account.type === 'ely') {
                const fallbackUrl = `https://mc-heads.net/head/${account.uuid}/${size}`
                console.log('SkinManager: Trying mc-heads.net fallback for head:', fallbackUrl)
                element.style.cssText = createHeadUrl(fallbackUrl, size)
                
                // If fallback also fails, use default skin
                element.onerror = () => {
                    console.log('SkinManager: Fallback also failed, using default head')
                    const defaultUrl = getDefaultSkinUrl('head', size)
                    element.style.cssText = createHeadUrl(defaultUrl, size)
                }
            } else {
                console.log('SkinManager: Using default head')
                const defaultUrl = getDefaultSkinUrl('head', size)
                element.style.cssText = createHeadUrl(defaultUrl, size)
            }
        }
    }).catch(error => {
        console.error('SkinManager: Error getting skin URL:', error)
        // In case of error use default skin
        const defaultUrl = getDefaultSkinUrl('head', size)
        element.style.cssText = createHeadUrl(defaultUrl, size)
    })
}

/**
 * Get skin URL from Ely.by
 * 
 * @param {string} uuid Player UUID
 * @param {string} type Skin type
 * @param {number} size Size
 * @returns {string} Skin URL
 */
function getElySkinUrl(uuid, type, size) {
    // Ely.by uses skin system on skinsystem.ely.by
    // URL format: http://skinsystem.ely.by/skins/{nickname}.png
    // But we need nickname, not UUID
    
    // To get skin by UUID we need to get nickname first
    // For now use fallback to mc-heads.net
    console.log('SkinManager: Ely.by skin requested for UUID:', uuid)
    
    switch (type) {
        case 'head':
            return `https://mc-heads.net/head/${uuid}/${size}`
        case 'body':
            return `https://mc-heads.net/body/${uuid}/${size}`
        case 'avatar':
            return `https://mc-heads.net/body/${uuid}/right`
        default:
            return `https://mc-heads.net/head/${uuid}/${size}`
    }
}

/**
 * Get default skin URL
 * 
 * @param {string} type Skin type
 * @param {number} size Size
 * @returns {string} Default skin URL
 */
function getDefaultSkinUrl(type, size) {
    // Return default Steve skin
    const steveUuid = 'c06f89064c8a49119c29ea1dbd1aab82' // Steve's UUID
    return getMojangSkinUrl(steveUuid, type, size)
}

/**
 * Update skin in element
 * 
 * @param {HTMLElement} element Element to update
 * @param {Object} account Account object
 * @param {string} type Skin type
 * @param {number} size Size
 */
function updateSkinInElement(element, account, type = 'head', size = 40) {
    if (!element) {
        console.log('SkinManager: No element provided for skin update')
        return
    }
    
    // Use async function to get skin URL
    getSkinUrl(account, type, size).then(skinUrl => {
        console.log('SkinManager: Updating element with skin URL:', skinUrl)
        
        if (element.tagName === 'IMG') {
            element.src = skinUrl
            element.alt = account.displayName || 'Player'
            console.log('SkinManager: Set img src to:', skinUrl)
            
            // Add error handler for fallback to default skin
            element.onerror = () => {
                console.log('SkinManager: Image failed to load, trying fallback')
                
                // If this is Ely.by skin, try several fallback options
                if (account.type === 'ely') {
                    // Try mc-heads.net with UUID
                    const fallbackUrl1 = `https://mc-heads.net/head/${account.uuid}/${size}`
                    console.log('SkinManager: Trying mc-heads.net fallback (UUID):', fallbackUrl1)
                    element.src = fallbackUrl1
                    
                    // If that doesn't work, try mc-heads.net with username
                    element.onerror = () => {
                        if (account.username) {
                            const fallbackUrl2 = `https://mc-heads.net/head/${account.username}/${size}`
                            console.log('SkinManager: Trying mc-heads.net fallback (username):', fallbackUrl2)
                            element.src = fallbackUrl2
                            
                            // If that doesn't work either, use default skin
                            element.onerror = () => {
                                console.log('SkinManager: All fallbacks failed, using default skin')
                                element.src = getDefaultSkinUrl(type, size)
                            }
                        } else {
                            console.log('SkinManager: No username available, using default skin')
                            element.src = getDefaultSkinUrl(type, size)
                        }
                    }
                } else {
                    console.log('SkinManager: Using default skin')
                    element.src = getDefaultSkinUrl(type, size)
                }
            }
        } else {
            // Set background image
            element.style.backgroundImage = `url('${skinUrl}')`
            console.log('SkinManager: Set background image to:', skinUrl)
        }
    }).catch(error => {
        console.error('SkinManager: Error getting skin URL:', error)
        // In case of error use default skin
        const defaultUrl = getDefaultSkinUrl(type, size)
        if (element.tagName === 'IMG') {
            element.src = defaultUrl
        } else {
            element.style.backgroundImage = `url('${defaultUrl}')`
        }
    })
}

/**
 * Check if skin is available
 * 
 * @param {string} url Skin URL
 * @returns {Promise<boolean>} Whether skin is available
 */
async function checkSkinAvailability(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' })
        return response.ok
    } catch (error) {
        return false
    }
}

// Export functions
module.exports = {
    getSkinUrl,
    getMojangSkinUrl,
    getElySkinUrlByNickname,
    getElySkinUrlByHash,
    getElyTexturesInfo,
    getDefaultSkinUrl,
    updateSkinInElement,
    updateHeadInElement,
    createHeadUrl,
    checkSkinAvailability,
    checkElyByAvailability
}
