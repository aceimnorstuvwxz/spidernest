// (C) 2018 netqon.com all rights reserved.

const jsonfile = require('jsonfile');
const electron = require('electron');
const path = require('path');
const locale = require('./locale');
const utils = require('./utils');
const moment = require('moment');
const {remote} = require('electron');
const {Menu, MenuItem} = remote;
const Store = require('electron-store');
const store = new Store();
const htmlencode = require('htmlencode');
const uuidgen = require('uuid/v4');


/* monaco editor */
//这个amdRequire的方法，见html中的script代码
amdRequire(['vs/editor/editor.main'], () => {
    onModuleLoaded();
})

let g_editor_codeout = null
let g_editor_codein = null
let g_editor_doc = null
let g_editor_queue = []
let g_editor_options = {
    value: [
        '# hello netqon'
    ].join('\n'),
    language: 'markdown',
    automaticLayout: true,
    theme: "vs-light",
    lineNumbers: "on",
    fontFamily: "Menlo",
    fontSize: 14,
    wordWrap: 'on',
    codeLens: false,
    formatOnPaste: true,
    glyphMargin: false,
    minimap: {
        enabled: false
    },
    lineNumbersMinChars: 2,
    scrollBeyondLastLine: false,
    scrollbar: {
        // vertical: 'visible',
        verticalScrollbarSize: 3
    },
    folding: false,
    // contextmenu: false // no builtin contextmenu
}

function onModuleLoaded() {
    g_editor_options.language = 'javascript'
    g_editor_codeout = monaco.editor.create(document.getElementById('editor_codeout'), g_editor_options)
    g_editor_codein = monaco.editor.create(document.getElementById('editor_codein'), g_editor_options)
    g_editor_options.language = 'markdown'
    g_editor_doc = monaco.editor.create(document.getElementById('editor_doc'), g_editor_options)

    g_editor_queue.push(g_editor_codeout)
    g_editor_queue.push(g_editor_codein)
    g_editor_queue.push(g_editor_doc)

    on_editor_inited()
}

let g_dirty = false
function on_editor_inited() {
    g_editor_queue.forEach(editor=>{
        editor.getModel().onDidChangeContent(function (e) {

            if (g_selected_module_element == null) {
                return
            }
            if (!g_dirty) {
                g_dirty = true
                refresh_save_dirty()
            }
        })
    })

}

function refresh_save_dirty() {
    $('#btn_module_save').attr('dirty', g_dirty ? 'true':'false')
}

function update_editor_layout() {
    // to fix editor can not auto width down
    let unmain_width_total = $('#solution_space').width() + $('#module_space').width()
    let editor_count = $('.head-tab[pressed="true"]').length
    let editor_width = (window.innerWidth - unmain_width_total) / editor_count

    //below way, will cause too many time, so the screen will flash white
    // let w = (window.innerWidth - $('#record_space').width - $('#target_space').width - $('#side').width)/2

    g_editor_queue.forEach(editor=>{
        editor.layout({ width: editor_width, height: window.innerHeight - 30 })
    })
}

window.onresize = function (e) {
    update_editor_layout()
}

document.addEventListener('DOMContentLoaded', function () {
    console.log("init window");
    locale.init();


    $('#help_space>webview').attr('src', `http://spidernest.netqon.com/embedded.html?t=${Date.now()}`);


    electron.ipcRenderer.send('get-all-solutions');

    $('#btn_add_solution').click(on_click_new_solution)
    $('#btn_add_module').click(on_click_new_module)

    $('#btn_add_new_solution').click(on_click_new_solution)
    $('#btn_remove_solution_confirm').click(on_click_remove_solution_confirm)
    $('#btn_delete_modules_confirm').click(on_click_delete_modules_confirm)

    $('#btn_open_snapshot').click(on_click_open_snapshot)
    $('#btn_open_origin').click(on_click_open_origin)

    $('#fill_solution_space').contextmenu(function (e) {
        e.preventDefault()
        const menu = new Menu()
        menu.append(new MenuItem({label: 'New solution', click: on_click_new_solution, accelerator: 'CmdOrCtrl+N'}))
        menu.popup({window: remote.getCurrentWindow()})
    })


    $('#btn_open_settings').click(function () {
        electron.ipcRenderer.send('open-settings')
    })

    $('iframe').attr('src', "http://spidernest.netqon.com/embedded.html?t=" + new Date().getTime())

    $('.head-tab').click(on_click_head_tab)

    $('#btn_module_save').click(on_click_save_module)

    $('#input_module_name').keydown(on_module_name_change)
})

function on_click_head_tab(event) {

    let tab = $(event.target)
    if (tab.attr('pressed') == 'true') {
        tab.attr('pressed', 'false')
        $(`#editor_${tab.attr("tab-name")}`).hide()
    } else {
        tab.attr('pressed', 'true')
        $(`#editor_${tab.attr("tab-name")}`).show()
    }

    update_editor_layout()
}



/* save size of window */
window.onbeforeunload = function () {
    console.log("try save before close")
    store.set('width', window.innerWidth)
    store.set('height', window.innerHeight + (utils.is_win() ? 55 : 0))
}

/* solutions */
let g_is_solution_new = true
let g_under_config_solution_element = null
let g_solution_map = {} // id=>element -> element.web_solution
function add_new_solution_element(solution, root = false) {
    let new_element = $('#solution_template').clone()
    new_element.removeAttr('id')

    new_element.find('.solution-name').text(solution.name)
    new_element.find('.solution-desc').text(solution.desc)

    new_element.prependTo('#solution_list')
    new_element.web_solution = solution
    g_solution_map[solution.id] = new_element

    new_element.click(on_select_solution.bind(null, solution.id))

    new_element.contextmenu(function (e) {
        e.preventDefault()
        const menu = new Menu()

        menu.append(new MenuItem({
            label: utils.lg('删除', 'Delete'),
            click: on_click_remove_solution.bind(null, new_element)
        }))
        menu.append(new MenuItem({
            label: utils.lg('属性', 'Edit'),
            click: on_click_config_solution.bind(null, new_element)
        }))

        menu.popup({window: remote.getCurrentWindow()})
    })

}

function on_click_open_in_browser(solution_element) {
    electron.remote.shell.openExternal(solution_element.web_solution.desc)
}

function send_cmd(data) {
    electron.ipcRenderer.send('cmd', data)
}

function on_click_check_immediately(solution_element) {
    send_cmd({'cmd': 'check-immediately', data: solution_element.web_solution.id})
}

let g_under_removing_solution_element = null

function on_click_remove_solution(solution_element) {
    g_under_removing_solution_element = solution_element
    $('#remove_solution_dialog').find('#remove_solution_name').text(solution_element.web_solution.name)
    $('#remove_solution_dialog').modal('show')
}

function on_click_remove_module(module_element) {
    var r=confirm(`删除模块 ${module_element.web_module.name} ?`)
    if (r==true)
    {
      electron.ipcRenderer.send('remove-module', module_element.web_module.id)
    }
}

electron.ipcRenderer.on("remove-module", (e, module_id)=>{
    g_module_map[module_id].remove()
    delete g_module_map[module_id]
})

let g_under_delete_modules_element = null

function on_click_delete_modules(solution_element) {
    g_under_delete_modules_element = solution_element
    $('#delete_modules_dialog').find('#delete_modules_solution_name').text(solution_element.web_solution.name)
    $('#delete_modules_dialog').modal('show')
}

function on_click_mark_all_read(solution_element) {
    if (g_selected_solution_element == solution_element) {
        $('.module').find('.module-indication').attr('type', '1')
    }

    solution_element.find('.solution-indication').attr('indication', 'false')

    electron.ipcRenderer.send('mark-all-read', solution_element.web_solution.id)
}

function on_click_remove_solution_confirm() {
    $('#remove_solution_dialog').modal('hide')

    if (g_under_removing_solution_element == g_selected_solution_element) {
        unselect_solution()
    }
    g_under_removing_solution_element.remove()
    electron.ipcRenderer.send('remove-solution', g_under_removing_solution_element.web_solution.id)
    g_under_config_solution_element = null
}

function on_click_delete_modules_confirm() {
    $('#delete_modules_dialog').modal('hide')
    $('#module_list').empty()
    electron.ipcRenderer.send('delete-modules', g_under_delete_modules_element.web_solution.id)
    g_under_delete_modules_element = null
}

function on_click_toggle_pause_solution(solution_element) {
    console.log('click pause/resume solution')
    solution_element.web_solution.state = solution_element.web_solution.state == utils.solution_STATE.NORMAL ? utils.solution_STATE.PAUSED : utils.solution_STATE.NORMAL
    solution_element.find('.solution-paused').attr('paused', solution_element.web_solution.state == utils.solution_STATE.NORMAL ? "false" : "true")
    electron.ipcRenderer.send('set-solution-state', {
        solution_id: solution_element.web_solution.id,
        state: solution_element.web_solution.state
    })
}

function on_click_toggle_mute_solution(solution_element) {
    console.log('click mute/unmute solution')
    solution_element.web_solution.muted = solution_element.web_solution.muted == 0 ? 1 : 0
    solution_element.find('.solution-muted').attr('muted', solution_element.web_solution.muted == 0 ? "false" : "true")
    electron.ipcRenderer.send('set-solution-muted', {
        solution_id: solution_element.web_solution.id,
        state: solution_element.web_solution.muted
    })
}

electron.ipcRenderer.on('open-new-solution', function (e, data) {
    on_click_new_solution()
})


electron.ipcRenderer.on('new-solution', function (e, solution) {
    add_new_solution_element(solution)
})

electron.ipcRenderer.on('all-solutions', function (e, data) {
    console.log('all solutions', data)
    data.solutions.forEach((solution, index) => {
        add_new_solution_element(solution)
    })
})

electron.ipcRenderer.on('new-solution-icon', function (e, data) {
    console.log('new-solution-icon', data)
    g_solution_map[data.solution_id].find('.solution-image').attr('src', data.icon)
})

electron.ipcRenderer.on('solution-update', function (e, data) {
    console.log('solution-update', data)
    let element = g_solution_map[data.id]
    element.find('.solution-name').text(data.name)
    element.find('.solution-desc').text(data.desc)
    element.web_solution.name = data.name
    element.web_solution.desc = data.desc
})

let g_selected_solution_element = null

function on_select_solution(solution_id) {

    $('#help_space').hide()
    $('#module_space').show()
    $('#content_space').show()

    let element = g_solution_map[solution_id]
    let solution = element.web_solution
    console.log('click select element', solution.name, solution.id)

    if (g_selected_solution_element == element) {
        return
    }

    if (g_selected_solution_element) {
        g_selected_solution_element.attr('select', 'false')
    }

    element.attr('select', 'true')
    g_selected_solution_element = element

    $('#module_list').empty()
    g_module_map = {}

    electron.ipcRenderer.send('get-all-modules',solution.id)
}

function unselect_solution() {
    g_selected_module_element = null
    g_selected_solution_element = null
    $('#module_list').empty()
    $('#html_diff').empty()
}

function on_click_new_solution() {
    electron.ipcRenderer.send('open-edit-solution')
}

function on_click_config_solution(solution_element) {
    electron.ipcRenderer.send('open-edit-solution', solution_element.web_solution.id)
}

function on_click_new_module() {
    console.log('click new module')
    electron.ipcRenderer.send('new-module', {
        id: uuidgen(),
        solution_id: g_selected_solution_element.web_solution.id,
        name: "unamed module",
        doc: '',
        config: '{}',
        codeout: '',
        codein: '',
        extra: '',
        count: 0,
        state: 0,
        date: Date.now(),
        data: ''
    })
}

/* modules */
electron.ipcRenderer.on('all-modules', function (e, modules) {
    console.log('all modules', modules)
    modules.forEach(function (module) {
        add_new_module_element(module)
    })
})

electron.ipcRenderer.on('new-module', function (e, module) {
    console.log('new module', module)
    add_new_module_element(module, true)
})

let g_module_map = {}

function add_new_module_element(module, at_top = false) {

    let root = g_selected_solution_element.web_solution.id == 'root'
    let new_element = $('#module_template').clone()
    new_element.removeAttr('id')
    new_element.find('.module-name').text(module.name)
    new_element.find('.module-id').text(module.id.slice(0, 8).toUpperCase())
    new_element.attr('title', module.id)

    new_element.web_module = module
    if (at_top) {
        new_element.prependTo('#module_list')
    } else {
        new_element.appendTo('#module_list')
    }

    g_module_map[module.id] = new_element
    new_element.click(on_select_module.bind(null, module.id))

    new_element.contextmenu(function (e) {
        e.preventDefault()
        const menu = new Menu()

        menu.append(new MenuItem({
            label: utils.lg('删除', 'Delete'),
            click: on_click_remove_module.bind(null, new_element)
        }))

        menu.popup({window: remote.getCurrentWindow()})
    })
}

let g_selected_module_element = null

function on_select_module(module_id) {
    let element = g_module_map[module_id]
    let module = element.web_module

    if (g_selected_module_element == element) {
        //same one, pass
        return
    }

    //unselect current
    if (g_selected_module_element) {
        g_selected_module_element.attr('select', 'false')
    }

    //select new
    element.attr('select', 'true')
    g_selected_module_element = element

    $('#head_module_id').text(module.id.slice(0, 8).toUpperCase())
    $('#input_module_name').val(module.name)

    g_editor_codeout.setValue(module.codeout)
    g_editor_codein.setValue(module.codein)
    g_editor_doc.setValue(module.doc)
    g_dirty = false
    refresh_save_dirty()
}

function  on_click_save_module() {
    console.log('save module')
    if (g_dirty) {
        g_dirty = false
        refresh_save_dirty()

        let module = g_selected_module_element.web_module
        module.name = $('#input_module_name').val()
        module.doc = g_editor_doc.getValue()
        module.codein = g_editor_codein.getValue()
        module.codeout = g_editor_codeout.getValue()
        g_selected_module_element.find('.module-name').text(module.name)

        electron.ipcRenderer.send('update-module', module)
    }
}

function on_module_name_change() {
    if (g_selected_module_element) {
        g_dirty = true
        refresh_save_dirty()
    }
}


function on_click_open_snapshot() {
    if (g_selected_module_element) {
        electron.ipcRenderer.send('open-snapshot', g_selected_module_element.web_module.id)
    }
}

function on_click_open_origin() {
    if (g_selected_module_element) {
        let addr = g_solution_map[g_selected_module_element.web_module.solution_id].web_solution.desc
        electron.remote.shell.openExternal(addr)
    }
}

electron.ipcRenderer.on('cmd', function (e, data) {
    if (data == 'open-new-solution') {
        on_click_new_solution()
    }
})



electron.ipcRenderer.on('solution-checking-state', (e, data) => {
    console.log(data)

    let element = g_solution_map[data.solution_id]
    if (data.checking) {
        element.find('.solution-desc').text(utils.lg('检查中...', 'Checking...'))
    } else {
        element.find('.solution-desc').text(element.web_solution.desc)
    }
})