const electron = require('electron');
const utils = require('./utils')
const uuidgen = require('uuid/v4');
const urllib = require('url')
const path = require('path')
const { URL } = require('url')

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
electron.ipcRenderer.on("module-to-play", (e, data)=>{
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

function init_after_get_module() {
    //获得module之后执行
}