/**
 * Инициализация SkinManager как глобального объекта
 */
const SkinManager = require('./assets/js/skinmanager')

// Делаем SkinManager доступным глобально
window.SkinManager = SkinManager

// Добавляем отладочную информацию
console.log('SkinManager initialized:', window.SkinManager)
