/**
 * Script for login.ejs
 */
// Validation Regexes.
const validUsername         = /^[a-zA-Z0-9_]{1,16}$/
const basicEmail            = /^\S+@\S+\.\S+$/
//const validEmail          = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i

// Login Elements
const loginCancelContainer  = document.getElementById('loginCancelContainer')
const loginCancelButton     = document.getElementById('loginCancelButton')
const loginEmailError       = document.getElementById('loginEmailError')
const loginUsername         = document.getElementById('loginUsername')
const loginPasswordError    = document.getElementById('loginPasswordError')
const loginPassword         = document.getElementById('loginPassword')
const checkmarkContainer    = document.getElementById('checkmarkContainer')
const loginRememberOption   = document.getElementById('loginRememberOption')
const loginButton           = document.getElementById('loginButton')
const loginForm             = document.getElementById('loginForm')

// Control variables.
let lu = false, lp = false


/**
 * Show a login error.
 * 
 * @param {HTMLElement} element The element on which to display the error.
 * @param {string} value The error text.
 */
function showError(element, value){
    element.innerHTML = value
    element.style.opacity = 1
}

/**
 * Shake a login error to add emphasis.
 * 
 * @param {HTMLElement} element The element to shake.
 */
function shakeError(element){
    if(element.style.opacity == 1){
        element.classList.remove('shake')
        void element.offsetWidth
        element.classList.add('shake')
    }
}

/**
 * Validate that an email field is neither empty nor invalid.
 * 
 * @param {string} value The email value.
 */
function validateEmail(value){
    if(value){
        if(!basicEmail.test(value) && !validUsername.test(value)){
            showError(loginEmailError, Lang.queryJS('login.error.invalidValue'))
            loginDisabled(true)
            lu = false
        } else {
            loginEmailError.style.opacity = 0
            lu = true
            if(lp){
                loginDisabled(false)
            }
        }
    } else {
        lu = false
        showError(loginEmailError, Lang.queryJS('login.error.requiredValue'))
        loginDisabled(true)
    }
}

/**
 * Validate that the password field is not empty.
 * 
 * @param {string} value The password value.
 */
function validatePassword(value){
    if(value){
        loginPasswordError.style.opacity = 0
        lp = true
        if(lu){
            loginDisabled(false)
        }
    } else {
        lp = false
        showError(loginPasswordError, Lang.queryJS('login.error.invalidValue'))
        loginDisabled(true)
    }
}

// Emphasize errors with shake when focus is lost.
loginUsername.addEventListener('focusout', (e) => {
    validateEmail(e.target.value)
    shakeError(loginEmailError)
})
loginPassword.addEventListener('focusout', (e) => {
    validatePassword(e.target.value)
    shakeError(loginPasswordError)
})

// Validate input for each field.
loginUsername.addEventListener('input', (e) => {
    validateEmail(e.target.value)
})
loginPassword.addEventListener('input', (e) => {
    validatePassword(e.target.value)
})

/**
 * Enable or disable the login button.
 * 
 * @param {boolean} v True to enable, false to disable.
 */
function loginDisabled(v){
    if(loginButton.disabled !== v){
        loginButton.disabled = v
    }
}

/**
 * Enable or disable loading elements.
 * 
 * @param {boolean} v True to enable, false to disable.
 */
function loginLoading(v){
    if(v){
        loginButton.setAttribute('loading', v)
        loginButton.innerHTML = loginButton.innerHTML.replace(Lang.queryJS('login.login'), Lang.queryJS('login.loggingIn'))
    } else {
        loginButton.removeAttribute('loading')
        loginButton.innerHTML = loginButton.innerHTML.replace(Lang.queryJS('login.loggingIn'), Lang.queryJS('login.login'))
    }
}

/**
 * Enable or disable login form.
 * 
 * @param {boolean} v True to enable, false to disable.
 */
function formDisabled(v){
    loginDisabled(v)
    loginCancelButton.disabled = v
    loginUsername.disabled = v
    loginPassword.disabled = v
    if(v){
        checkmarkContainer.setAttribute('disabled', v)
    } else {
        checkmarkContainer.removeAttribute('disabled')
    }
    loginRememberOption.disabled = v
}

let loginViewOnSuccess = VIEWS.landing
let loginViewOnCancel = VIEWS.settings
let loginViewCancelHandler

function loginCancelEnabled(val){
    if(val){
        $(loginCancelContainer).show()
    } else {
        $(loginCancelContainer).hide()
    }
}

loginCancelButton.onclick = (e) => {
    switchView(getCurrentView(), loginViewOnCancel, 500, 500, () => {
        loginUsername.value = ''
        loginPassword.value = ''
        loginCancelEnabled(false)
        if(loginViewCancelHandler != null){
            loginViewCancelHandler()
            loginViewCancelHandler = null
        }
    })
}

// Disable default form behavior.
loginForm.onsubmit = () => { return false }

// Bind login button behavior.
loginButton.addEventListener('click', () => {
    // Disable form.
    formDisabled(true)

    // Show loading stuff.
    loginLoading(true)

    // Determine authentication type
    const isElyLogin = window.isElyLogin || false
    
    const authPromise = isElyLogin 
        ? AuthManager.addElyAccount(loginUsername.value, loginPassword.value)
        : AuthManager.addMojangAccount(loginUsername.value, loginPassword.value)

    authPromise.then((value) => {
        updateSelectedAccount(value)
        loginButton.innerHTML = loginButton.innerHTML.replace(Lang.queryJS('login.loggingIn'), Lang.queryJS('login.success'))
        $('.circle-loader').toggleClass('load-complete')
        $('.checkmark').toggle()
        setTimeout(() => {
            switchView(VIEWS.login, loginViewOnSuccess, 500, 500, async () => {
                // Temporary workaround
                if(loginViewOnSuccess === VIEWS.settings){
                    await prepareSettings()
                }
                loginViewOnSuccess = VIEWS.landing // Reset this for good measure.
                loginCancelEnabled(false) // Reset this for good measure.
                loginViewCancelHandler = null // Reset this for good measure.
                loginUsername.value = ''
                loginPassword.value = ''
                $('.circle-loader').toggleClass('load-complete')
                $('.checkmark').toggle()
                loginLoading(false)
                loginButton.innerHTML = loginButton.innerHTML.replace(Lang.queryJS('login.success'), Lang.queryJS('login.login'))
                formDisabled(false)
            })
        }, 1000)
    }).catch((displayableError) => {
        loginLoading(false)

        // Check if two-factor authentication is required for ely.by
        if (isElyLogin && displayableError.requiresTwoFactor) {
            // Show dialog for TOTP token input
            showTwoFactorDialog(loginUsername.value, loginPassword.value)
            return
        }

        let actualDisplayableError
        if(isDisplayableError(displayableError)) {
            msftLoginLogger.error('Error while logging in.', displayableError)
            actualDisplayableError = displayableError
        } else {
            // Uh oh.
            msftLoginLogger.error('Unhandled error during login.', displayableError)
            actualDisplayableError = Lang.queryJS('login.error.unknown')
        }

        setOverlayContent(actualDisplayableError.title, actualDisplayableError.desc, Lang.queryJS('login.tryAgain'))
        setOverlayHandler(() => {
            formDisabled(false)
            toggleOverlay(false)
        })
        toggleOverlay(true)
    })

})

/**
 * Show dialog for TOTP token input for two-factor authentication
 * 
 * @param {string} username Username
 * @param {string} password User password
 */
function showTwoFactorDialog(username, password) {
    // Create dialog for TOTP token input
    const totpDialog = document.createElement('div')
    totpDialog.id = 'totpDialog'
    totpDialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `
    
    totpDialog.innerHTML = `
        <div style="background: #2c2c2c; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">
            <h3 style="color: #fff; margin-bottom: 20px; text-align: center;"><%- lang('settings.twoFactorAuth') %></h3>
            <p style="color: #ccc; margin-bottom: 20px; text-align: center;">
                <%- lang('settings.enterCodeTwoFactor') %>:
            </p>
            <input type="text" id="totpToken" placeholder="000000" maxlength="6" 
                   style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #555; 
                          background: #333; color: #fff; border-radius: 5px; text-align: center; font-size: 18px;">
            <div style="display: flex; gap: 10px;">
                <button id="totpCancel" style="flex: 1; padding: 10px; background: #666; color: #fff; 
                        border: none; border-radius: 5px; cursor: pointer;">Отмена</button>
                <button id="totpSubmit" style="flex: 1; padding: 10px; background: #4CAF50; color: #fff; 
                        border: none; border-radius: 5px; cursor: pointer;">Подтвердить</button>
            </div>
        </div>
    `
    
    document.body.appendChild(totpDialog)
    
    const totpTokenInput = document.getElementById('totpToken')
    const totpCancelBtn = document.getElementById('totpCancel')
    const totpSubmitBtn = document.getElementById('totpSubmit')
    
    // Focus on input field
    totpTokenInput.focus()
    
    // Event handlers
    totpCancelBtn.onclick = () => {
        document.body.removeChild(totpDialog)
        formDisabled(false)
        window.isElyLogin = false // Reset flag
    }
    
    totpSubmitBtn.onclick = () => {
        const totpToken = totpTokenInput.value.trim()
        if (totpToken.length !== 6) {
            alert('Пожалуйста, введите 6-значный код')
            return
        }
        
        // Remove dialog
        document.body.removeChild(totpDialog)
        
        // Show loading
        loginLoading(true)
        
        // Repeat authentication with TOTP token
        AuthManager.addElyAccount(username, password, totpToken).then((value) => {
            updateSelectedAccount(value)
            loginButton.innerHTML = loginButton.innerHTML.replace(Lang.queryJS('login.loggingIn'), Lang.queryJS('login.success'))
            $('.circle-loader').toggleClass('load-complete')
            $('.checkmark').toggle()
            setTimeout(() => {
                switchView(VIEWS.login, loginViewOnSuccess, 500, 500, async () => {
                    // Temporary workaround
                    if(loginViewOnSuccess === VIEWS.settings){
                        await prepareSettings()
                    }
                    loginViewOnSuccess = VIEWS.landing // Reset this for good measure.
                    loginCancelEnabled(false) // Reset this for good measure.
                    loginViewCancelHandler = null // Reset this for good measure.
                    loginUsername.value = ''
                    loginPassword.value = ''
                    $('.circle-loader').toggleClass('load-complete')
                    $('.checkmark').toggle()
                    loginLoading(false)
                    loginButton.innerHTML = loginButton.innerHTML.replace(Lang.queryJS('login.success'), Lang.queryJS('login.login'))
                    formDisabled(false)
                    window.isElyLogin = false // Reset flag
                })
            }, 1000)
        }).catch((displayableError) => {
            loginLoading(false)
            
            let actualDisplayableError
            if(isDisplayableError(displayableError)) {
                msftLoginLogger.error('Error while logging in with TOTP.', displayableError)
                actualDisplayableError = displayableError
            } else {
                msftLoginLogger.error('Unhandled error during TOTP login.', displayableError)
                actualDisplayableError = Lang.queryJS('login.error.unknown')
            }

            setOverlayContent(actualDisplayableError.title, actualDisplayableError.desc, Lang.queryJS('login.tryAgain'))
            setOverlayHandler(() => {
                formDisabled(false)
                toggleOverlay(false)
                window.isElyLogin = false // Reset flag
            })
            toggleOverlay(true)
        })
    }
    
    // Handle Enter key in input field
    totpTokenInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            totpSubmitBtn.click()
        }
    }
}