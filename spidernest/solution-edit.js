// (C)2018 netqon.com all rights reserved.
const electron = require('electron');
const path = require('path');
const locale = require('./locale')
const utils = require('./utils')
const uuidgen = require('uuid/v4');

let myclip

document.addEventListener('DOMContentLoaded', function () {
    console.log("update init")
    locale.init()

    $('#btn_save').click(on_click_save_solution)
})



function on_click_save_solution() {
    console.log('save solution')
    electron.ipcRenderer.send('new-solution', {
        id: uuidgen(),
        name: $('#solution_name').val(),
        desc: $('#solution_desc').val(),
        doc: '',
        web: $('#solution_web').val(),
        version: parseInt( $('#solution_version').val()),
        config: '{}',
        state: 0,
        extra:'',
        head: '',
        data: '',
        count: 0,
        date: Date.now()
    })

    setTimeout(()=>{
        window.close()
    }, 10)
}

