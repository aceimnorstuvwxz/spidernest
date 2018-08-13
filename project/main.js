const electron = require('electron')
const { app, BrowserWindow, Menu, ipcMain, globalShortcut, crashReporter } = electron;
const utils = require('./utils')
const main_utils = require('./main_utils')
const Store = require('electron-store')
const store = new Store()
const path = require('path')
const urllib = require('url')
const fs = require('fs')
const db = require('./db')
const rmdef = require('./rmdef')
console.log('userData=', app.getPath('userData'))

db.database_init()

app.on('ready', function () {
  createMainWindow()
  const menu = Menu.buildFromTemplate(get_menu_template())
  Menu.setApplicationMenu(menu)
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createMainWindow()
  }
})

app.on('will-quit', () => {
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
        { role: 'reload', label: lg('刷新', 'Reload') },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
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
          label: lg('了解更多', 'Learn More'),
          click() { require('electron').shell.openExternal('https://github.com/fateleak/irreader-readmode-editor') }
        }
      ]
    }
  ]


  if (utils.is_mac()) {
    menuTemplate.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: lg('关于 irreader readmode editor', 'About irreader readmode editor') },
        { type: 'separator' },
        { role: 'services', label: lg('服务', 'Services'), submenu: [] },
        { type: 'separator' },
        { role: 'hide', label: lg('隐藏 irreader readmode editor', 'Hide irreader readmode editor') },
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
        label: lg('关于 OpenWebMonitor', 'About OpenWebMonitor'),
        click() { }
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
          click() { process.crash() }
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

let mainWindow

function createMainWindow() {
  if (mainWindow == null) {

    let main_win_option = {
      width: 1750,
      height: 800
    }
    mainWindow = new BrowserWindow(main_win_option)

    mainWindow.loadURL(urllib.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    }))

    mainWindow.webContents.on('new-window', function (event, url) {
      event.preventDefault();
      electron.shell.openExternal(url)
    })

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

function list_remove_record(list, record_id) {
  let p = -1
  list.forEach((record, index) => {
    if (record.id == record_id) p = index
  })
  if (p >= 0) {
    list.splice(p, 1)
  }
}

let g_records_cache = new Map() //domain->[]
let g_records_map = new Map() //id->record

function guard_cache_with_domain(domain) {
  if (!g_records_cache.has(domain)) {
    g_records_cache.set(domain, [])
  }
}

ipcMain.on('new-record', (event, record) => {
  console.log('new record', record)

  db.save_record(record, (new_record) => {
    //回调中才会含有id
    guard_cache_with_domain(new_record.domain)
    g_records_cache.get(new_record.domain).push(new_record)
    g_records_map.set(new_record.id, new_record)

    main_utils.notify_all_windows('record-new', new_record)
  })

})

ipcMain.on('update-record', (event, record) => {
  console.log('update-record', record)

  //得先按旧的domain，从cache中删除旧的
  list_remove_record(g_records_cache.get(g_records_map.get(record.id).domain), record.id)

  db.update_record(record, () => {
    main_utils.notify_all_windows('record-updated', record)
  })
  guard_cache_with_domain(record.domain)
  g_records_cache.get(record.domain).push(record)
  g_records_map.set(record.id, record)
})

ipcMain.on('delete-record', (event, record_id) => {
  console.log('delete-record', record_id, typeof (record_id))
  db.delete_record(record_id)
  main_utils.notify_all_windows('record-deleted', record_id)
  list_remove_record(g_records_cache.get(g_records_map.get(record_id).domain), record_id)
  g_records_map.delete(record_id)
})

ipcMain.on('get-some-records', (event, data) => {
  db.get_some_records(data.offset, data.query, function (records) {
    main_utils.notify_all_windows('some-records', records)
  })
})

ipcMain.on('export-to', (event, export_path) => {
  console.log('export-to', export_path)
  if (export_path) {

    let lines = []
    g_records_cache.forEach((record_list, key)=>{
      let domain = key
      let frame_list = []
      rmdef.fields.forEach(field=>{
        frame_list.push([])
      })
      let hidden_list = []
      let inject_list = []
      record_list.forEach(record=>{
        if (record.frame_cssers) {
          record.frame_cssers.split('#1#').forEach((csser, index)=>{
            if (csser) frame_list[index].push(csser)
          })
        }
        if (record.hidden_cssers) {
          hidden_list.push(record.hidden_cssers.split('#1#').join(','))
        }
        if (record.inject_css) {
          inject_list.push(record.inject_css)
        }
      })
      let frame_bucket = []
      frame_list.forEach(list=>{
        frame_bucket.push(list.join(','))
      })
      let frame_part = frame_bucket.join('#1#').trim()
      let hidden_part = hidden_list.join(',').trim()
      let inject_part = inject_list.join(' ').split('\n').join(' ').trim()
      let record_line = `${domain}#0#${frame_part}#0#${hidden_part}#0#${inject_part}`

      lines.push(record_line)
    })
    fs.writeFile(export_path, lines.join('\n'), () => {
      main_utils.notify_all_windows('export-finish')
    })
  }
})


function load_records_cache() {
  console.log('load recoeds cache')
  db.get_all_records((records) => {
    records.forEach(record => {
      if (!g_records_cache.has(record.domain)) {
        g_records_cache.set(record.domain, [])
      }

      g_records_cache.get(record.domain).push(record)
      g_records_map.set(record.id, record)
    })
  })
}

load_records_cache()

ipcMain.on('find-match-records', (event, hostname) => {
  console.log('find match records', hostname)
  //把hostname按。分开后，从最长的开始寻找
  let words = hostname.split('.')
  let result = null
  for (let i = 0; i < words.length; i++) {
    let current_domain = words.slice(i).join('.')
    if (g_records_cache.has(current_domain) && g_records_cache.get(current_domain).length > 0) {
      result = g_records_cache.get(current_domain)
      break
    }
  }

  main_utils.notify_all_windows('match-records', result)
})


ipcMain.on('cmd', (event, data) => {
  main_utils.notify_all_windows(data.cmd, data.data)
})


ipcMain.on('get-readmode-state', (e, hostname) => {
  console.log('get-readmode-state', hostname)
  let words = hostname.split('.')
  let record_list = []
  for (let i = 0; i < words.length; i++) {
    let current_domain = words.slice(i).join('.')
    if (g_records_cache.has(current_domain) && g_records_cache.get(current_domain).length > 0) {
      record_list = g_records_cache.get(current_domain)
      break
    }
  }

  let frame_cssers_list = []
  let hidden_cssers_list = []
  let inject_css_list = []
  record_list.forEach((record)=>{
    if (record.frame_cssers && record.frame_cssers.length > 3*(rmdef.fields.length-1) ){
      //不为空，且长度大于全是'#1#'的时候，保证有内在内容
      frame_cssers_list.push(record.frame_cssers.split('#1#'))
    }
    if (record.hidden_cssers) {
      hidden_cssers_list.push(record.hidden_cssers.split('#1#').join(',')) //replace只能替换第一个
    }
    if (record.inject_css) {
      inject_css_list.push(record.inject_css)
    }
  })

  let frame_rule = null
  if (frame_cssers_list.length > 0) {
    frame_rule = {}
    rmdef.fields.forEach((field, index)=>{

      let tp = []
      frame_cssers_list.forEach((list)=>{
        let tmp_rule = list[index]
        if (tmp_rule) tp.push(tmp_rule)
      })
      frame_rule[field.name] = tp.join(',')
    })
  }

  let hidden_rule = null
  if (hidden_cssers_list.length > 0) {
    hidden_rule = hidden_cssers_list.join(',')
  }


  let inject_css = inject_css_list.join('  ').trim()

  main_utils.notify_all_windows('readmode-state',
    {
      hostname: hostname,
      is_readmode_on: store.get('is-readmode-on', false),
      is_rule_on: frame_cssers_list.length > 0 || hidden_cssers_list.length > 0 || inject_css.length > 0,
      frame_rule: frame_rule,
      hidden_rule: hidden_rule,
      inject_css:inject_css
    })
})