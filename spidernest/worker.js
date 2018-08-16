const electron = require('electron');
const utils = require('./utils')
const uuidgen = require('uuid/v4');
const urllib = require('url')
const path = require('path')
const { URL } = require('url')

window._irr = {}
_irr.eval = global.eval
_irr.raw_log = window.console.log
window.console.log = (...args) => {
    log_out(args)
}

window.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
}

let g_worker_id = uuidgen()
document.addEventListener('DOMContentLoaded', function () {
    console.log("update init")
    electron.ipcRenderer.send('get-module-to-play', g_worker_id)
    init_general()
})

let g_module = null
electron.ipcRenderer.on("module-to-play", (e, data) => {
    if (data.worker_id == g_worker_id) {
        console.log('module-to-play', data)
        //这是我们的
        g_module = data.module
        if (!g_module) {
            alert('[Err worker-01]未找到模块数据')
        }

        init_after_get_module()
    } else {
        //其他worker的数据，Pass
    }
})


function log(data) {
    if (utils.is_dev) {
        electron.ipcRenderer.send('log', data)
    }
}

function send_cmd(data) {
    electron.ipcRenderer.send('cmd', data)
}

function init_general() {

}

let g_out_log_queue = []
function log_out(...theArgs) {
    let line = $('<p class="log-line"></p>')
    line.text(theArgs.join(','))
    line.appendTo('#out_log')
    g_out_log_queue.push(line)
    if (g_out_log_queue.length > 100) {
        g_out_log_queue[0].remove()
        g_out_log_queue.shift()
    }
}

let g_in_log_queue = []
function log_in(...theArgs) {
    let line = $('<p class="log-line"></p>')
    line.text(theArgs.join(','))
    line.appendTo('#in_log')
    g_in_log_queue.push(line)
    if (g_in_log_queue.length > 100) {
        g_in_log_queue[0].remove()
        g_in_log_queue.shift()
    }
}
function test_out_function() {
    log_out('test out function')
}

function init_after_get_module() {
    //获得module之后执行
    $('#module_name').text(g_module.name)
    $('#module_id').text(g_module.id.slice(0, 8))

    log_out('获得', g_module.name)
    _irr.eval(g_module.codeout)
}

//想外部代码释放的接口
window._sn_out = {} //spider nest out API hub
_snapi.load_new_webview = () => {
    console.log('load new webview')
    let prelaod_fn = urllib.format({
        pathname: path.join(utils.get_userData(), 'module_preloads', g_module.id + '.js'),
        protocol: 'file:',
        slashes: true
    })

    let webview = $(`<webview preload="${prelaod_fn}" src="http://www.netqon.com"> </webview>`)
    webview.appendTo('#web_list')

    let web_raw = webview.get(0)

    // web_raw.addEventListener('load-commit', on_webview_load_commit.bind(null, web))
    // web_raw.addEventListener('did-start-loading', on_webview_start_loading.bind(null, web))
    // web_raw.addEventListener('did-stop-loading', on_webview_stop_loading.bind(null, web))
    // web_raw.addEventListener('did-finish-load', on_webview_finish_load.bind(null, web))
    // web_raw.addEventListener('did-fail-load', on_webview_fail_load.bind(null, web))
    // web_raw.addEventListener('will-navigate', on_webview_will_navigate.bind(null, web))
    // web_raw.addEventListener('did-navigate', on_webview_did_navigate.bind(null, web))
    // web_raw.addEventListener('new-window', on_webview_new_window.bind(null, web))
    // web_raw.addEventListener('will-download', on_webview_will_download.bind(null, web))
    // web_raw.addEventListener('page-favicon-updated', on_page_favicon_updated.bind(null, web))
    // web_raw.addEventListener('media-started-playing', () => {})
    // web_raw.addEventListener('dom-ready', function () {
    //     console.log('dom ready')
    // })
    web_raw.addEventListener('console-message', (e) => {
         _irr.raw_log(e)

        if (!e.message.includes('Electron Security Warning')) {
            log_in(e.message)
        }
    })

    return web_raw
}