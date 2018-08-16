const electron = require('electron');
const utils = require('./utils')
const db = require('./db')
const uuidgen = require('uuid/v4');
const urllib = require('url')
const path = require('path')
const { URL } = require('url')

window.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
}

document.addEventListener('DOMContentLoaded', function () {
    console.log("update init")

    db.database_init()
    monitor_init()
})

function log(data) {
    if (utils.is_dev) {
        electron.ipcRenderer.send('log', data)
    }
}

function send_cmd(data) {
    electron.ipcRenderer.send('cmd', data)
}
