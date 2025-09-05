const loginOptionsCancelContainer = document.getElementById('loginOptionCancelContainer')
const loginOptionEly = document.getElementById('loginOptionEly')
const loginOptionMicrosoft = document.getElementById('loginOptionMicrosoft')
const loginOptionMojang = document.getElementById('loginOptionMojang')
const loginOptionsCancelButton = document.getElementById('loginOptionCancelButton')

// Проверяем, что элементы существуют перед привязкой событий
if (loginOptionEly) {
    loginOptionEly.onclick = (e) => {
        switchView(getCurrentView(), VIEWS.login, 500, 500, () => {
            loginViewOnSuccess = loginOptionsViewOnLoginSuccess
            loginViewOnCancel = loginOptionsViewOnLoginCancel
            loginCancelEnabled(true)
            // Устанавливаем флаг для использования ely.by авторизации
            window.isElyLogin = true
        })
    }
}

if (loginOptionMicrosoft) {
    loginOptionMicrosoft.onclick = (e) => {
        switchView(getCurrentView(), VIEWS.waiting, 500, 500, () => {
            ipcRenderer.send(
                MSFT_OPCODE.OPEN_LOGIN,
                loginOptionsViewOnLoginSuccess,
                loginOptionsViewOnLoginCancel
            )
        })
    }
}

if (loginOptionMojang) {
    loginOptionMojang.onclick = (e) => {
        switchView(getCurrentView(), VIEWS.login, 500, 500, () => {
            loginViewOnSuccess = loginOptionsViewOnLoginSuccess
            loginViewOnCancel = loginOptionsViewOnLoginCancel
            loginCancelEnabled(true)
        })
    }
}

if (loginOptionsCancelButton) {
    loginOptionsCancelButton.onclick = (e) => {
        switchView(getCurrentView(), loginOptionsViewOnCancel, 500, 500, () => {
            // Clear login values (Mojang login)
            // No cleanup needed for Microsoft.
            loginUsername.value = ''
            loginPassword.value = ''
            if(loginOptionsViewCancelHandler != null){
                loginOptionsViewCancelHandler()
                loginOptionsViewCancelHandler = null
            }
        })
    }
}

let loginOptionsCancellable = false

let loginOptionsViewOnLoginSuccess
let loginOptionsViewOnLoginCancel
let loginOptionsViewOnCancel
let loginOptionsViewCancelHandler

function loginOptionsCancelEnabled(val){
    if(val){
        $(loginOptionsCancelContainer).show()
    } else {
        $(loginOptionsCancelContainer).hide()
    }
}
