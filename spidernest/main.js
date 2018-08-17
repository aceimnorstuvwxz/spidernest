// (C) 2018 netqon.com all rights reserved.

const electron = require('electron')
const { app, BrowserWindow, Menu, ipcMain, globalShortcut, crashReporter } = electron;
const utils = require('./utils')
const uuidgen = require('uuid/v4');
const main_utils = require('./main_utils')
const Store = require('electron-store')
const request = require('superagent');
const store = new Store()
const fs = require('fs')
const db = require('./db')

const path = require('path')
const urllib = require('url')

/* app */

app.on('ready', function () {

    db.database_init()
    createMainWindow()

    const menu = Menu.buildFromTemplate(get_menu_template())
    Menu.setApplicationMenu(menu)
})

app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createMainWindow() //点击dock的图标，能够打开主窗口
    }
})

app.on('will-quit', () => {
    // Unregister all shortcuts.
    globalShortcut.unregisterAll()
})


/* menu */
function lg(cn, en) {
    return app.getLocale() == 'zh-CN' ? cn : en;
}

function get_menu_template() {
    //locale在app ready之前，无法返回正确的值

    const menuTemplate = [
        {
            label: lg('文件', 'File'),
            submenu: [
                {
                    label: lg('新增目标', 'New solution'),
                    accelerator: 'CmdOrCtrl+N',
                    click() {
                        main_utils.notify_all_windows('open-new-solution', {})
                    }
                },
                {
                    label: lg('登录某网站', 'Login to Site'),
                    click() {
                        openLoginSiteWindow()
                    }
                }
            ]
        },
        {
            label: lg('编辑', 'Edit'),
            submenu: [
                { role: 'undo', label: lg('撤销', 'Undo') },
                { role: 'redo', label: lg('恢复', 'Redo') },
                { type: 'separator' },
                { role: 'cut', label: lg('剪切', 'Cut') },
                { role: 'copy', label: lg('复制', 'Copy') },
                { role: 'paste', label: lg('粘贴', 'Paste') },
                { role: 'selectall', label: lg('全选', 'Select All') }
            ]
        },
        {
            label: lg('查看', 'View'),
            submenu: [
                // { role: 'reload', label: lg('刷新', 'Reload') },
                // {role: 'forcereload'},
                // {role: 'toggledevtools'},
                // {type: 'separator'},
                { role: 'zoomin', label: lg('放大', 'Zoom In') },
                { role: 'zoomout', label: lg('缩小', 'Zoom Out') },
                { role: 'resetzoom', label: lg('重置缩放', 'Reset Zoom') },
                { type: 'separator' },
                { role: 'togglefullscreen', label: lg('切换全屏', 'Toggle Fun Screen') }
            ]
        },
        {
            role: 'window',
            label: lg('窗口', 'Window'),
            submenu: [
                { role: 'minimize', label: lg('最小化', 'Minimize') },
                { role: 'close', label: lg('关闭', 'Close') }
            ]
        },
        {
            role: 'help',
            label: lg('帮助', 'Help'),
            submenu: [
                {
                    label: lg('反馈', 'Feedback'),
                    click() {
                        require('electron').shell.openExternal('https://github.com/fateleak/spidernest')
                    }
                },
                {
                    label: lg('检查更新', "Check for updates"),
                    click() {
                        openCheckUpdateWindow()
                    }
                },
                { type: 'separator' },
                {
                    label: lg('了解更多', 'Learn More'),
                    click() {
                        require('electron').shell.openExternal('http://spidernest.netqon.com')
                    }
                }
            ]
        }
    ]


    if (utils.is_mac()) {
        menuTemplate.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about', label: lg('关于 spidernest', 'About spidernest') },
                { type: 'separator' },
                {
                    label: lg('偏好设置', 'Preferences'),
                    accelerator: 'CommandOrControl+,',
                    click() {
                        createSettingWindow()
                    }
                },
                { role: 'services', label: lg('服务', 'Services'), submenu: [] },
                { type: 'separator' },
                { role: 'hide', label: lg('隐藏 spidernest', 'Hide spidernest') },
                { role: 'hideothers', label: lg('隐藏其它', 'Hide Others') },
                { role: 'unhide', label: lg('显示全部', 'Show All') },
                { type: 'separator' },
                { role: 'quit', lable: lg('退出', 'Quit') }
            ]
        })

        // mac's Window menu
        menuTemplate[4].submenu = [
            { role: 'close', label: lg('关闭', 'Close') },
            { role: 'minimize', label: lg('最小化', 'Minimize') },
            { role: 'zoom', label: lg('缩放', 'Zoom') },
            { type: 'separator' },
            { role: 'front', label: lg('全部置于顶层', 'Bring All to Front') }
        ]
    } else {
        //For Win32, add settings and Exit
        menuTemplate[0].submenu.push(
            {
                label: lg('设置', 'Settings'),
                click() {
                    createSettingWindow()
                },
                accelerator: 'Ctrl+,'

            }
        )

        menuTemplate[0].submenu.push(
            { type: 'separator' }
        )
        menuTemplate[0].submenu.push(
            {
                role: 'quit',
                label: lg('退出', 'Exit'),
                accelerator: 'Ctrl+q'
            }
        )

        menuTemplate[4].submenu.unshift(
            {
                role: 'about',
                label: lg('关于 spidernest', 'About spidernest'),
                click() {
                    openAboutWindow()
                }
            }
        )
    }

    if (utils.is_dev) {
        menuTemplate.push({
            label: 'Dev',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
                {
                    label: 'test crash',
                    click() {
                        process.crash()
                    }
                },
                {
                    label: 'relaunch',
                    click() {
                        app.relaunch()
                        app.exit(0)
                    }
                }
            ]
        })
    }

    return menuTemplate
}

// ---------- Main Window ---------

let mainWindow

function createMainWindow() {
    if (mainWindow == null) {

        // Create the browser window.
        let main_win_option = {
            width: store.get('width', 1150),
            height: store.get('height', 700)
        }
        if (utils.is_mac() && !utils.is_dev) {
            main_win_option.titleBarStyle = 'hidden'
        } else {
            // main_win_option.frame = false
        }
        mainWindow = new BrowserWindow(main_win_option)

        // and load the index.html of the app.
        mainWindow.loadURL(urllib.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: 'file:',
            slashes: true
        }))

        mainWindow.webContents.on('new-window', function (event, url) {
            event.preventDefault();
            electron.shell.openExternal(url)
        })

        // mainWindow.openDevTools()

        mainWindow.on('closed', function () {
            mainWindow = null
            if (utils.is_mac()) {
                app.dock.hide() //dock图标随主窗口关闭
            }
        })

        if (utils.is_mac()) {
            app.dock.show() // dock图标随主窗口
        }
    } else {
        mainWindow.show()
    }


}

ipcMain.on('open-main-window', function (e, data) {
    let t = mainWindow == null ? 1000 : 100
    createMainWindow()
    if (data) {
        setTimeout(function () {
            main_utils.notify_all_windows('cmd', data)
        }, t)
    }
})

ipcMain.on('router', (e, data)=>{
    main_utils.notify_all_windows(data.solution_id, data.data)
})

/* ABOUT */
let aboutWindow;//win32

function openAboutWindow() {
    if (aboutWindow != null) {
        aboutWindow.show()
    } else {
        aboutWindow = new BrowserWindow({
            webPreferences: { webSecurity: false },
            width: 300,
            height: 500
        })

        aboutWindow.loadURL(urllib.format({
            pathname: path.join(__dirname, 'about.html'),
            protocol: 'file:',
            slashes: true
        }))

        aboutWindow.setResizable(true)
        if (utils.is_win()) {
            // no menu for checkupdate win in windows
            aboutWindow.setMenu(null)
        }

        aboutWindow.on('closed', function () {
            aboutWindow = null
        })
    }

}

ipcMain.on('new-solution', function (e, solution) {
    console.log('new-solution', solution)
    db.db_save_new_solution(solution)
    main_utils.notify_all_windows('new-solution', solution)
})

ipcMain.on('update-solution', function (e, data) {
    console.log('update-solution', data)
    db.db_update_solution_config(data.id, data.name, data.address, data.min_change, data.min_len, data.way, data.added_only, data.csser, data.config)

    setTimeout(() => {
        db.db_get_solution_by_id(data.id, (solution) => {
            main_utils.notify_all_windows('solution-update', solution)
        })
    }, 1000)
})


ipcMain.on('get-all-solutions', function (e, data) {
    console.log('get-all-solution')
    db.db_get_all_solutions(function (rows) {
        main_utils.notify_all_windows('all-solutions', {
            solutions: rows
        })
    }, true)
})

ipcMain.on('remove-solution', function (e, data) {
    console.log('remove-solution')
    db.db_remove_solution(data)
    db.db_delete_modules(data)
    main_utils.notify_all_windows('solution-removed', data.id)
})

ipcMain.on('set-solution-state', function (e, data) {
    db.db_set_solution_state(data.solution_id, data.state)
})

ipcMain.on('set-solution-muted', function (e, data) {
    db.db_set_solution_muted(data.solution_id, data.state)
})

/* modules */
ipcMain.on('get-all-modules', function (e, solution_id) {
    db.db_get_all_modules(solution_id, function (modules) {
        main_utils.notify_all_windows('all-modules', modules)
    })
})

ipcMain.on('update-module', function (e, module) {
    console.log('update module', module)
    db.db_update_module(module)
})

ipcMain.on('new-module', function (e, module) {
    console.log('new-module', module)
    db.db_save_new_module(module)
    main_utils.notify_all_windows('new-module', module)
})

ipcMain.on('remove-module', function (e, module_id) {
    console.log(("remove module", module_id))
    db.db_delete_module(module_id)
    main_utils.notify_all_windows('remove-module', module_id)
})

ipcMain.on('delete-modules', function (e, data) {
    db.db_delete_modules(data)
})

ipcMain.on('cmd', function (e, data) {
    main_utils.notify_all_windows(data.cmd, data.data)
})


// new source
let g_editSolutionWindow = null

function openEditSolutionWindow() {
    if (g_editSolutionWindow != null) {
        g_editSolutionWindow.show()
    } else {

        let win_option = {
            width: 400,
            height: 700
        }

        g_editSolutionWindow = new BrowserWindow(win_option)

        g_editSolutionWindow.loadURL(urllib.format({
            pathname: path.join(__dirname, 'solution-edit.html'),
            protocol: 'file:',
            slashes: true
        }))

        g_editSolutionWindow.setResizable(true)
        if (utils.is_win() && !utils.is_dev) {
            g_editSolutionWindow.setMenu(null)
        }

        g_editSolutionWindow.on('closed', function () {
            g_editSolutionWindow = null
        })

        g_editSolutionWindow.webContents.on('new-window', function (event, url) {
            event.preventDefault();
            electron.shell.openExternal(url)
        })
    }
}

let g_edit_solution_id = null
ipcMain.on('open-edit-solution', function (e, solution_id) {
    g_edit_solution_id = solution_id
    openEditSolutionWindow()
})


ipcMain.on('get-solution-to-edit', (e) => {
    if (g_edit_solution_id) {
        db.db_get_solution_by_id(g_edit_solution_id, (solution) => {
            main_utils.notify_all_windows('solution-to-edit', solution)
        })
    }
})

// module 运行窗口

let g_wait_to_play_module_queue = []
ipcMain.on('play-module', (e, module_id) => {
    g_wait_to_play_module_queue.push(module_id)
    openNewModuleWindow()
})

ipcMain.on('get-module-to-play', (e, worker_id) => {
    console.log("queue state before", g_wait_to_play_module_queue)
    if (g_wait_to_play_module_queue.length > 0) {
        let module_id = g_wait_to_play_module_queue[0]
        g_wait_to_play_module_queue.shift()
        db.db_get_module(module_id, (module)=>{
            dump_module_preload(module)
            db.db_get_solution_by_id(module.solution_id, (solution)=>{
                main_utils.notify_all_windows('module-to-play', {module: module, solution: solution, worker_id: worker_id})
            })
        })
    } else {
        main_utils.notify_all_windows('module-to-play', {module: null, solution: null, worker_id: worker_id})
    }
})

//module_preload的前置代码
let g_module_preload_preset_code = `
const electron = require('electron')
const g_solution_id = '%solution_id%'
console.log('this is preload preset code')
window._irr_raw_log = window.console.log
window.console.log = (...args)=>{
    window._irr_raw_log(args.join(','))
}

electron.ipcRenderer.on(g_solution_id, (e, data)=>{
    if (data.cmd) {
        if (_snapi.listener_map.has(data.cmd)){
            _snapi.listener_map.get(data.cmd).forEach(callback=>{
                callback(data.data)
            })
        }
    }
})

window._snapi = {} 

_snapi.send = (cmd, data)=>{
    electron.ipcRenderer.send('router', {solution_id: g_solution_id, data: {cmd:cmd, data:data}})
}

_snapi.listener_map = new Map()
_snapi.on = (cmd, listener)=>{
    if (!_snapi.listener_map.has(cmd)) {
        _snapi.listener_map.set(cmd, [])
    }
    _snapi.listener_map.get(cmd).push(listener)
}

`
function dump_module_preload(module) {

    let preload_dir = path.join(utils.get_userData(), 'module_preloads')

    if (!fs.existsSync(preload_dir)){
        fs.mkdirSync(preload_dir);
    }

    let preload_fn = path.join(preload_dir, module.id + '.js')
    console.log("dump preload, ", preload_fn)
    fs.writeFileSync(preload_fn, g_module_preload_preset_code.replace('%solution_id%', module.solution_id) + module.codein)
}

let g_module_window_map = {}

function openNewModuleWindow() {

    let win_option = {
        width: 700,
        height: 700
    }

    let tmp_win = new BrowserWindow(win_option)

    tmp_win.loadURL(urllib.format({
        pathname: path.join(__dirname, 'worker.html'),
        protocol: 'file:',
        slashes: true
    }))

    tmp_win.setResizable(true)        
    tmp_win.setMenu(null)

    tmp_win.on('closed', function () {
    })

    tmp_win.webContents.on('new-window', function (event, url) {
        event.preventDefault();
        electron.shell.openExternal(url)
    })
}