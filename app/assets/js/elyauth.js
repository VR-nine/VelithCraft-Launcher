/**
 * ElyAuth
 * 
 * Модуль для авторизации через сервис ely.by.
 * Реализует протокол авторизации, совместимый с Mojang API.
 * 
 * @module elyauth
 */
// Requirements
const { LoggerUtil } = require('helios-core')
const { RestResponseStatus } = require('helios-core/common')
const { ELY_CONFIG } = require('./ipcconstants')
const Lang = require('./langloader')

const log = LoggerUtil.getLogger('ElyAuth')

/**
 * Коды ошибок для ely.by
 */
const ElyErrorCode = {
    ILLEGAL_ARGUMENT: 'IllegalArgumentException',
    FORBIDDEN_OPERATION: 'ForbiddenOperationException',
    TWO_FACTOR_REQUIRED: 'ForbiddenOperationException', // Специальный случай для 2FA
    UNKNOWN: 'Unknown'
}

/**
 * Класс для работы с REST API ely.by
 */
class ElyRestAPI {
    /**
     * Аутентификация пользователя через ely.by
     * 
     * @param {string} username Никнейм пользователя или email
     * @param {string} password Пароль пользователя или пароль:токен для 2FA
     * @param {string} clientToken Уникальный токен лаунчера
     * @param {boolean} requestUser Если true, включает информацию о пользователе в ответ
     * @returns {Promise<Object>} Результат аутентификации
     */
    static async authenticate(username, password, clientToken, requestUser = true) {
        try {
            const requestBody = {
                username: username.trim(),
                password: password,
                clientToken: clientToken,
                requestUser: requestUser
            }

            log.info('Отправка запроса аутентификации на ely.by...')
            
            const response = await fetch(`${ELY_CONFIG.AUTH_SERVER_URL}/auth/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            })

            const data = await response.json()

            if (response.ok) {
                log.info('Аутентификация успешна')
                return {
                    responseStatus: RestResponseStatus.SUCCESS,
                    data: data
                }
            } else {
                log.error('Ошибка аутентификации:', data)
                
                // Обработка специального случая 2FA
                if (response.status === 401 && 
                    data.error === ElyErrorCode.FORBIDDEN_OPERATION && 
                    data.errorMessage === 'Account protected with two factor auth.') {
                    return {
                        responseStatus: RestResponseStatus.ERROR,
                        elyErrorCode: ElyErrorCode.TWO_FACTOR_REQUIRED,
                        error: data
                    }
                }

                return {
                    responseStatus: RestResponseStatus.ERROR,
                    elyErrorCode: data.error || ElyErrorCode.UNKNOWN,
                    error: data
                }
            }
        } catch (error) {
            log.error('Ошибка при выполнении запроса аутентификации:', error)
            return {
                responseStatus: RestResponseStatus.ERROR,
                elyErrorCode: ElyErrorCode.UNKNOWN,
                error: error
            }
        }
    }

    /**
     * Валидация токена доступа
     * 
     * @param {string} accessToken Токен доступа
     * @param {string} clientToken Токен клиента
     * @returns {Promise<Object>} Результат валидации
     */
    static async validate(accessToken, clientToken) {
        try {
            const requestBody = {
                accessToken: accessToken,
                clientToken: clientToken
            }

            log.info('Валидация токена через ely.by...')
            
            const response = await fetch(`${ELY_CONFIG.AUTH_SERVER_URL}/auth/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            })

            if (response.ok) {
                log.info('Токен валиден')
                return {
                    responseStatus: RestResponseStatus.SUCCESS,
                    data: true
                }
            } else {
                log.warn('Токен невалиден')
                return {
                    responseStatus: RestResponseStatus.SUCCESS,
                    data: false
                }
            }
        } catch (error) {
            log.error('Ошибка при валидации токена:', error)
            return {
                responseStatus: RestResponseStatus.ERROR,
                elyErrorCode: ElyErrorCode.UNKNOWN,
                error: error
            }
        }
    }

    /**
     * Обновление токена доступа
     * 
     * @param {string} accessToken Текущий токен доступа
     * @param {string} clientToken Токен клиента
     * @returns {Promise<Object>} Результат обновления
     */
    static async refresh(accessToken, clientToken) {
        try {
            const requestBody = {
                accessToken: accessToken,
                clientToken: clientToken
            }

            log.info('Обновление токена через ely.by...')
            
            const response = await fetch(`${ELY_CONFIG.AUTH_SERVER_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            })

            const data = await response.json()

            if (response.ok) {
                log.info('Токен успешно обновлен')
                return {
                    responseStatus: RestResponseStatus.SUCCESS,
                    data: data
                }
            } else {
                log.error('Ошибка обновления токена:', data)
                return {
                    responseStatus: RestResponseStatus.ERROR,
                    elyErrorCode: data.error || ElyErrorCode.UNKNOWN,
                    error: data
                }
            }
        } catch (error) {
            log.error('Ошибка при обновлении токена:', error)
            return {
                responseStatus: RestResponseStatus.ERROR,
                elyErrorCode: ElyErrorCode.UNKNOWN,
                error: error
            }
        }
    }

    /**
     * Инвалидация токена доступа
     * 
     * @param {string} accessToken Токен доступа
     * @param {string} clientToken Токен клиента
     * @returns {Promise<Object>} Результат инвалидации
     */
    static async invalidate(accessToken, clientToken) {
        try {
            const requestBody = {
                accessToken: accessToken,
                clientToken: clientToken
            }

            log.info('Инвалидация токена через ely.by...')
            
            const response = await fetch(`${ELY_CONFIG.AUTH_SERVER_URL}/auth/invalidate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            })

            if (response.ok) {
                log.info('Токен успешно инвалидирован')
                return {
                    responseStatus: RestResponseStatus.SUCCESS,
                    data: true
                }
            } else {
                log.error('Ошибка инвалидации токена')
                return {
                    responseStatus: RestResponseStatus.ERROR,
                    elyErrorCode: ElyErrorCode.UNKNOWN,
                    error: 'Failed to invalidate token'
                }
            }
        } catch (error) {
            log.error('Ошибка при инвалидации токена:', error)
            return {
                responseStatus: RestResponseStatus.ERROR,
                elyErrorCode: ElyErrorCode.UNKNOWN,
                error: error
            }
        }
    }
}

/**
 * Преобразование ошибок ely.by в отображаемые сообщения
 * 
 * @param {string} errorCode Код ошибки
 * @returns {Object} Объект с заголовком и описанием ошибки
 */
function elyErrorDisplayable(errorCode) {
    switch (errorCode) {
        case ElyErrorCode.ILLEGAL_ARGUMENT:
            return {
                title: Lang.queryJS('auth.ely.error.illegalArgumentTitle'),
                desc: Lang.queryJS('auth.ely.error.illegalArgumentDesc')
            }
        case ElyErrorCode.FORBIDDEN_OPERATION:
            return {
                title: Lang.queryJS('auth.ely.error.forbiddenOperationTitle'),
                desc: Lang.queryJS('auth.ely.error.forbiddenOperationDesc')
            }
        case ElyErrorCode.TWO_FACTOR_REQUIRED:
            return {
                title: Lang.queryJS('auth.ely.error.twoFactorRequiredTitle'),
                desc: Lang.queryJS('auth.ely.error.twoFactorRequiredDesc')
            }
        case ElyErrorCode.UNKNOWN:
        default:
            return {
                title: Lang.queryJS('auth.ely.error.unknownTitle'),
                desc: Lang.queryJS('auth.ely.error.unknownDesc')
            }
    }
}

// Экспортируем API и утилиты
module.exports = {
    ElyRestAPI,
    ElyErrorCode,
    elyErrorDisplayable
}
