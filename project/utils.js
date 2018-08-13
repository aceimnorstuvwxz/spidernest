const electron = require('electron')
const path = require('path')
const Store = require('electron-store')
const store = new Store()

exports.app_theme_dev = false
exports.is_dev = false //<<<<<<
exports.is_mas = false  //<<<<<<<

let g_is_cn = is_win()? true : (electron.app ? electron.app.getLocale() : electron.remote.app.getLocale()) == 'zh-CN' //<<<<<<
//win下始终是中文

exports.is_cn = g_is_cn
exports.lg = (cn, en) => {
    return g_is_cn ? cn : en
}


function version_string_2_code(ver) {
    //x.x.x
    let arr = ver.split('.')
    arr = arr.map(x => parseInt(x))
    let sum = 10000 * arr[0] + 100 * arr[1] + 1 * arr[2]
    return sum
}

function is_mac() {
    return process.platform == 'darwin'
}

function is_win() {
    return !is_mac()
}


function random_select(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

exports.version_string_2_code = version_string_2_code
exports.is_win = is_win
exports.is_mac = is_mac
exports.random_select = random_select

exports.len = function (text) {
    return Buffer.byteLength(text, 'utf8')
}

exports.remove_hash = function (url) {
    return url.split('#')[0]
}

function pad(num) {
    return ("0" + num).slice(-2);
}

exports.mmss = (secs) => {
    secs = Math.floor(secs)
    let minutes = Math.floor(secs / 60);
    secs = secs % 60;
    return '' + minutes + ":" + pad(secs)
}

exports.escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

exports.get_userData = () => {
    return electron.app ? electron.app.getPath('userData') : electron.remote.app.getPath('userData')
}

exports.safe_json_parse = (text) => {
    r = {}
    try {
        r = JSON.parse(text)
    } catch (e) {
    }
    r = r ? r : {}
    return r
}

exports.get_file_ext = (p) => {
    let t = p.split('.').pop()
    t = t.split('#')[0]//remove hash
    t = t.split('?')[0] //remove query part
    return t.toLowerCase()
}
