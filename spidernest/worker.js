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
let g_solution = null
electron.ipcRenderer.on("module-to-play", (e, data) => {
    if (data.worker_id == g_worker_id) {
        console.log('module-to-play', data)
        //这是我们的
        g_module = data.module
        g_solution = data.solution
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

    $('#btn_open_dev').click(()=>{
        electron.remote.getCurrentWindow().openDevTools()
    })
}

let g_out_log_queue = []
function log_out(...theArgs) {
    _irr.raw_log(theArgs.join(','))
    let line = $('<div class="log-line"></div>')
    line.text(new Date().toLocaleTimeString() + ' ' + theArgs.join(','))
    line.appendTo('#out_log')
    g_out_log_queue.push(line)
    if (g_out_log_queue.length > 100) {
        g_out_log_queue[0].remove()
        g_out_log_queue.shift()
    }
    let objDiv = document.getElementById('out_log')
    objDiv.scrollTop = objDiv.scrollHeight;
}

let g_in_log_queue = []
function log_in(...theArgs) {
    let line = $('<div class="log-line"></div>')
    line.text(new Date().toLocaleTimeString() + ' ' + theArgs.join(','))
    line.appendTo('#in_log')
    g_in_log_queue.push(line)
    if (g_in_log_queue.length > 100) {
        g_in_log_queue[0].remove()
        g_in_log_queue.shift()
    }

    let objDiv = document.getElementById('in_log')
    objDiv.scrollTop = objDiv.scrollHeight;
}
function test_out_function() {
    log_out('test out function')
}

function init_after_get_module() {
    //获得module之后执行
    $('#solution_name').text(g_solution.name)
    $('#module_name').text(g_module.name)

    $('head>title').text(g_solution.name + '/'+g_module.name)

    log_out('get module:', g_module.name)
    
    electron.ipcRenderer.on(g_solution.id, (e, data)=>{
        if (data.cmd) {
            if (_snapi.listener_map.has(data.cmd)){
                _snapi.listener_map.get(data.cmd).forEach(callback=>{
                    callback(data.data)
                })
            }
        }
    })
    log_out('set up listener loop')

    let code_to_eval = `
    try
  {
  ${g_module.codeout}
  }
catch(err)
  {
  console.log('[Exception]', err)
  }
  `

    _irr.eval(code_to_eval)
}

//想外部代码释放的接口
window._snapi = {} 
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

_snapi.send = (cmd, data)=>{
    electron.ipcRenderer.send('router', {solution_id: g_solution.id, data: {cmd:cmd, data:data}})
}

_snapi.listener_map = new Map()
_snapi.on = (cmd, listener)=>{
    if (!_snapi.listener_map.has(cmd)) {
        _snapi.listener_map.set(cmd, [])
    }
    _snapi.listener_map.get(cmd).push(listener)
}
