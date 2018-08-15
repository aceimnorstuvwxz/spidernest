// (C)2018 netqon.com all rights reserved.
const electron = require('electron')
const path = require('path')

exports.app_theme_dev = false
exports.is_dev = true //是否打开开发调试
exports.is_mas = false //是否是给mas编译

let g_is_cn = true; // 始终是中文 is_win()? true : (electron.app ? electron.app.getLocale() : electron.remote.app.getLocale()) == 'zh-CN' //<<<<<<

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

exports.data_file = (fn) => {
    return path.join(electron.app ? electron.app.getPath('userData'):electron.remote.app.getPath('userData') , fn)
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

exports.UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36 LikeFeed/0.1.0"


exports.safe_json_parse = (text) => {
    r = {}
    try {
        r = JSON.parse(text)
    } catch (e) {
    }
    r = r ? r : {}
    return r
}

exports.get_embedded_url = () => {
    return 'http://spidernest.netqon.com/embedded.html?t=' + Date.now() + `&lan=${g_is_cn ? 'zh' : 'en'}`
}


exports.get_theme_url = () => {
    return 'http://spidernest.netqon.com/themes.html?t=' + Date.now() + `&lan=${g_is_cn ? 'zh' : 'en'}`
}

exports.get_file_ext = (p) => {
    let t = p.split('.').pop()
    t = t.split('#')[0]//remove hash
    t = t.split('?')[0] //remove query part
    return t.toLowerCase()
}

exports.get_product_site_url = () => {
    return 'http://spidernest.netqon.com'
}
