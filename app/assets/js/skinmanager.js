/**
 * SkinManager
 * 
 * Модуль для управления скинами игроков из разных источников.
 * Поддерживает Mojang, Microsoft и Ely.by скины.
 * 
 * @module skinmanager
 */

/**
 * Получить URL скина для аккаунта
 * 
 * @param {Object} account Объект аккаунта
 * @param {string} type Тип скина ('head', 'body', 'avatar')
 * @param {number} size Размер изображения
 * @returns {Promise<string>} URL скина
 */
async function getSkinUrl(account, type = 'head', size = 40) {
    if (!account || !account.uuid) {
        console.log('SkinManager: No account or UUID provided, using default skin')
        return getDefaultSkinUrl(type, size)
    }

    console.log('SkinManager: Getting skin for account:', account.type, account.uuid, account.username, type, size)

    switch (account.type) {
        case 'ely':
            // Для Ely.by используем username вместо UUID
            if (account.username) {
                const elyUrl = await getElySkinUrlByNickname(account.username, type, size)
                console.log('SkinManager: Ely.by skin URL (by username):', elyUrl)
                return elyUrl
            } else {
                // Fallback на скин по умолчанию если username недоступен
                console.log('SkinManager: No username available for Ely.by account, using default skin')
                return getDefaultSkinUrl(type, size)
            }
        case 'microsoft':
        case 'mojang':
        default:
            const mojangUrl = getMojangSkinUrl(account.uuid, type, size)
            console.log('SkinManager: Mojang skin URL:', mojangUrl)
            return mojangUrl
    }
}

/**
 * Получить URL скина из Mojang/mc-heads
 * 
 * @param {string} uuid UUID игрока
 * @param {string} type Тип скина
 * @param {number} size Размер
 * @returns {string} URL скина
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
 * Получить информацию о текстурах из Ely.by API
 * 
 * @param {string} username Ник игрока
 * @returns {Promise<Object>} Информация о текстурах
 */
async function getElyTexturesInfo(username) {
    try {
        console.log('SkinManager: Getting Ely.by textures info for username:', username)
        
        // Используем простой endpoint skinsystem.ely.by
        const response = await fetch(`http://skinsystem.ely.by/profile/${username}`)
        
        if (!response.ok) {
            console.error('SkinManager: Failed to get Ely.by textures info:', response.status)
            return null
        }
        
        const data = await response.json()
        console.log('SkinManager: Ely.by profile info:', data)
        
        // Ищем свойство textures в properties
        if (data.properties && Array.isArray(data.properties)) {
            const texturesProperty = data.properties.find(prop => prop.name === "textures")
            if (texturesProperty) {
                try {
                    // Декодируем base64 значение
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
 * Получить URL скина из Ely.by по nickname
 * 
 * @param {string} nickname Ник игрока
 * @param {string} type Тип скина
 * @param {number} size Размер
 * @returns {Promise<string>} URL скина
 */
async function getElySkinUrlByNickname(nickname, type, size) {
    console.log('SkinManager: Getting Ely.by skin by nickname:', nickname)
    
    try {
        // Получаем информацию о текстурах напрямую по nickname
        const texturesInfo = await getElyTexturesInfo(nickname)
        
        if (!texturesInfo || !texturesInfo.textures || !texturesInfo.textures.SKIN) {
            console.error('SkinManager: No skin info found for nickname:', nickname)
            return getDefaultSkinUrl(type, size)
        }
        
        // Извлекаем URL скина
        const skinUrl = texturesInfo.textures.SKIN.url
        console.log('SkinManager: Ely.by skin URL:', skinUrl)
        
        // Возвращаем оригинальный URL скина напрямую
        return skinUrl
        
    } catch (error) {
        console.error('SkinManager: Error getting Ely.by skin by nickname:', error)
        return getDefaultSkinUrl(type, size)
    }
}


/**
 * Получить URL скина из Ely.by по хешу скина
 * 
 * @param {string} skinHash Хеш скина
 * @param {string} type Тип скина
 * @param {number} size Размер
 * @returns {string} URL скина
 */
function getElySkinUrlByHash(skinHash, type, size) {
    // Ely.by использует формат: https://ely.by/storage/skins/{hash}.png
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
 * Проверить доступность Ely.by API
 * 
 * @returns {Promise<boolean>} Доступен ли Ely.by API
 */
async function checkElyByAvailability() {
    try {
        const response = await fetch('https://ely.by/storage/skins/test.png', { 
            method: 'HEAD',
            timeout: 5000 // 5 секунд таймаут
        })
        return response.ok || response.status === 404 // 404 тоже нормально для тестового запроса
    } catch (error) {
        console.log('SkinManager: Ely.by API unavailable:', error.message)
        return false
    }
}

/**
 * Создать URL для отображения только головы из текстуры скина
 * 
 * @param {string} skinUrl URL полной текстуры скина
 * @param {number} size Размер головы
 * @returns {string} URL для отображения головы
 */
function createHeadUrl(skinUrl, size = 40) {
    // Для Ely.by и других источников, которые возвращают полную текстуру,
    // мы можем использовать CSS для обрезки головы
    // Голова в Minecraft текстуре находится в координатах 8,8 размером 8x8 пикселей
    // из текстуры 64x64 пикселей
    
    // Создаем CSS стиль для обрезки головы
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
 * Обновить элемент с обрезанной головой игрока
 * 
 * @param {HTMLElement} element Элемент для обновления
 * @param {Object} account Объект аккаунта
 * @param {number} size Размер головы
 */
function updateHeadInElement(element, account, size = 40) {
    if (!element) {
        console.log('SkinManager: No element provided for head update')
        return
    }
    
    // Используем асинхронную функцию для получения URL скина
    getSkinUrl(account, 'head', size).then(skinUrl => {
        console.log('SkinManager: Updating element with head from skin URL:', skinUrl)
        
        // Применяем стиль для обрезки головы
        const headStyle = createHeadUrl(skinUrl, size)
        element.style.cssText = headStyle
        
        console.log('SkinManager: Applied head style to element')
        
        // Добавляем обработчик ошибок для fallback
        element.onerror = () => {
            console.log('SkinManager: Head image failed to load, trying fallback')
            
            // Если это Ely.by скин, попробуем fallback на mc-heads.net
            if (account.type === 'ely') {
                const fallbackUrl = `https://mc-heads.net/head/${account.uuid}/${size}`
                console.log('SkinManager: Trying mc-heads.net fallback for head:', fallbackUrl)
                element.style.cssText = createHeadUrl(fallbackUrl, size)
                
                // Если и fallback не работает, используем скин по умолчанию
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
        // В случае ошибки используем скин по умолчанию
        const defaultUrl = getDefaultSkinUrl('head', size)
        element.style.cssText = createHeadUrl(defaultUrl, size)
    })
}

/**
 * Получить URL скина из Ely.by
 * 
 * @param {string} uuid UUID игрока
 * @param {string} type Тип скина
 * @param {number} size Размер
 * @returns {string} URL скина
 */
function getElySkinUrl(uuid, type, size) {
    // Ely.by использует систему скинов на skinsystem.ely.by
    // URL формат: http://skinsystem.ely.by/skins/{nickname}.png
    // Но нам нужен nickname, а не UUID
    
    // Для получения скина по UUID нужно сначала получить nickname
    // Пока используем fallback на mc-heads.net
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
 * Получить URL скина по умолчанию
 * 
 * @param {string} type Тип скина
 * @param {number} size Размер
 * @returns {string} URL скина по умолчанию
 */
function getDefaultSkinUrl(type, size) {
    // Возвращаем скин Стива по умолчанию
    const steveUuid = 'c06f89064c8a49119c29ea1dbd1aab82' // UUID Стива
    return getMojangSkinUrl(steveUuid, type, size)
}

/**
 * Обновить скин в элементе
 * 
 * @param {HTMLElement} element Элемент для обновления
 * @param {Object} account Объект аккаунта
 * @param {string} type Тип скина
 * @param {number} size Размер
 */
function updateSkinInElement(element, account, type = 'head', size = 40) {
    if (!element) {
        console.log('SkinManager: No element provided for skin update')
        return
    }
    
    // Используем асинхронную функцию для получения URL скина
    getSkinUrl(account, type, size).then(skinUrl => {
        console.log('SkinManager: Updating element with skin URL:', skinUrl)
        
        if (element.tagName === 'IMG') {
            element.src = skinUrl
            element.alt = account.displayName || 'Player'
            console.log('SkinManager: Set img src to:', skinUrl)
            
            // Добавляем обработчик ошибок для fallback на скин по умолчанию
            element.onerror = () => {
                console.log('SkinManager: Image failed to load, trying fallback')
                
                // Если это Ely.by скин, попробуем несколько fallback вариантов
                if (account.type === 'ely') {
                    // Попробуем mc-heads.net с UUID
                    const fallbackUrl1 = `https://mc-heads.net/head/${account.uuid}/${size}`
                    console.log('SkinManager: Trying mc-heads.net fallback (UUID):', fallbackUrl1)
                    element.src = fallbackUrl1
                    
                    // Если и это не работает, попробуем mc-heads.net с username
                    element.onerror = () => {
                        if (account.username) {
                            const fallbackUrl2 = `https://mc-heads.net/head/${account.username}/${size}`
                            console.log('SkinManager: Trying mc-heads.net fallback (username):', fallbackUrl2)
                            element.src = fallbackUrl2
                            
                            // Если и это не работает, используем скин по умолчанию
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
            element.style.backgroundImage = `url('${skinUrl}')`
            console.log('SkinManager: Set background image to:', skinUrl)
        }
    }).catch(error => {
        console.error('SkinManager: Error getting skin URL:', error)
        // В случае ошибки используем скин по умолчанию
        const defaultUrl = getDefaultSkinUrl(type, size)
        if (element.tagName === 'IMG') {
            element.src = defaultUrl
        } else {
            element.style.backgroundImage = `url('${defaultUrl}')`
        }
    })
}

/**
 * Проверить, доступен ли скин
 * 
 * @param {string} url URL скина
 * @returns {Promise<boolean>} Доступен ли скин
 */
async function checkSkinAvailability(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' })
        return response.ok
    } catch (error) {
        return false
    }
}

// Экспортируем функции
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
