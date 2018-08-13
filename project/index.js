const electron = require('electron')
const dialog = electron.remote.dialog
const path = require('path')
const locale = require('./locale')
const utils = require('./utils')
const { remote } = require('electron')
const { Menu, MenuItem } = remote
const Store = require('electron-store')
const store = new Store()
const urllib = require('url')
const fs = require('fs')
const rmdef = require('./rmdef')
const icmenu = require('./icmenu')


document.addEventListener('DOMContentLoaded', function () {
  console.log("init window")
  locale.init()

  $('#btn_devtool').click(() => {
    $('#webview').get(0).openDevTools()
  })

  $('#btn_back').click(() => {
    if ($('#webview').get(0).canGoBack()) {
      $('#webview').get(0).goBack()
    }
  })
  
  $('#btn_forward').click(() => {
    if ($('#webview').get(0).canGoForward()) {
      $('#webview').get(0).goForward()
    }
  })

  init_webview()

  $('#input_address').val('http://www.gameres.com/815232.html')

  $('#record_space').scroll(function (e) {
    //bug: 目前scroll到底部后时，切换一组record时，会错误的触发本事件，而导致同一组some-records会出现两次。因而增加判断当前的record的数量来屏蔽此错误。
    // console.log(e.target.scrollTop, $(window).height(), e.target.clientHeight, $('#record_list').height())
    if ($('.record').length > 0 &&
      g_record_no_more == false &&
      e.target.scrollTop + $(window).height() >= $('#record_list').height() - 50) {
      console.log('get more record')
      get_some_records()
    }
  })

  get_some_records()

  $('#btn_search').click(() => {
    g_record_no_more = false
    $('#record_space').empty()
    g_record_element_map = {}
    get_some_records()
  })

  $('#btn_export').click(on_click_export)

  $('#input_address').get(0).addEventListener("keyup", function (event) {
    event.preventDefault();
    if (event.keyCode === 13) {
      on_click_load()
    }
  })

  $('#btn_load').click(on_click_load)

  init_editing_area()


  icmenu.auto_create()
})



function get_some_records() {
  electron.ipcRenderer.send('get-some-records',
    {
      offset: $('#record_space .record').length,
      query: $('#input_search').val().trim()
    })
}

function init_webview() {

  let web_raw = $('#webview').get(0)

  web_raw.addEventListener('contextmenu', function (event) {
    console.log('right-click')
  })


  web_raw.addEventListener('console-message', (e) => {
    console.log('【Webview】:', e.message)
  })

  // web_raw.addEventListener('load-commit', on_webview_load_commit.bind(null, web))
  web_raw.addEventListener('did-start-loading', () => {
    note('loading')
  })
  // web_raw.addEventListener('did-stop-loading', ())
  web_raw.addEventListener('did-finish-load', () => {
    note('load complete')
  })
  web_raw.addEventListener('did-fail-load', () => {
    if (event.isMainFrame) {
      if (event.errorCode != -3 && event.errorCode != -20 && event.errorCode != 0) {
        note(event.errorDescription)
      }
    }
  })
  web_raw.addEventListener('will-navigate', (event) => {
    console.log(event)
  })
  web_raw.addEventListener('did-navigate', (event) => {
    console.log(event)
    $('#input_address').val(event.url)
    refresh_rules_by_url(event.url)
  })
  web_raw.addEventListener('new-window', (event) => {
    $('#webview').get(0).loadURL(event.url)
  })
  // web_raw.addEventListener('will-download', on_webview_will_download.bind(null, web))
  web_raw.addEventListener('page-favicon-updated', (event) => {
    console.log(event)
    $('#webview').get(0).executeJavaScript(`_irr.inject_target_data('irreader editor', '${event.favicons[0]}' )`)

  })

  web_raw.addEventListener('dom-ready', function () {
    console.log('dom ready')
  })
}

function update_from_address() {
  let url = $('#input_address').val()
  let myurl = urllib.parse(url)
  $('#input_domain').val(myurl.host)
  $('#input_test_url').val(url)
  console.log(myurl)
}


function note(text) {
  $('#note').text(text)
}

let g_record_data_map = {}
let g_record_element_map = {}
function add_new_record_element(record, at_top) {
  let new_element = $('#record_template').clone()
  new_element.find('.record-id').text('#' + record.id + ' ')

  new_element.find('.record-domain').text(record.domain)
  new_element.find('.record-extra').text(record.extra)
  new_element.click(on_click_record.bind(null, record.id))
  g_record_element_map[record.id] = new_element

  if (at_top) {
    new_element.prependTo('#record_space')
  } else {
    new_element.appendTo('#record_space')
  }
}


let g_record_no_more = false
electron.ipcRenderer.on('some-records', function (e, records) {
  console.log('all records', records)
  records.forEach(function (record) {
    g_record_data_map[record.id] = record
    add_new_record_element(record, false)
  })
  g_record_no_more = false
  if (records.length == 0) {
    g_record_no_more = true
    console.log('no more records')
  }
})

function on_click_record(record_id) {
  let record = g_record_data_map[record_id]
  if (record) {
    console.log('load record', record)
    setup_editing_record(record)
    $('#webview').get(0).loadURL(record.test_url)
  }
}

function get_year_month_date() {
  let date = new Date()
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

let g_export_path = null
function on_click_export() {
  dialog.showSaveDialog(
    { defaultPath: `irreader-readmode-rules-${get_year_month_date()}.txt` },
    (filename) => {
      console.log('write opml to', filename)
      g_export_path = filename
      electron.ipcRenderer.send('export-to', g_export_path)
    })
}

function remove_new_line(text) {
  return text.replace(/(\r\n\t|\n|\r\t)/gm, '')
}

electron.ipcRenderer.on('export-finish', (event) => {
  alert('Export Done')
})


function on_click_load() {
  let address_text = $('#input_address').val()

  if (!address_text.includes('://')) {
    address_text = "http://" + address_text
  }

  $('#input_address').val(address_text)
  $('#webview').get(0).loadURL(address_text)
}

function refresh_rules_by_url(test_url) {
  if (!test_url) {
    test_url = $('#input_address').val()
  }
  //告知url变更，若hostname变化，则要重新获取，否则不动
  electron.ipcRenderer.send('find-match-records', new URL(test_url).hostname)
}

let g_editing_records = {}
electron.ipcRenderer.on('match-records', (event, records) => {
  console.log('match records', records)

  $('#match_records .match-record-real').remove()

  if (records) {
    records.forEach(record => {
      let new_match_record = $('#match_record_template').clone()
      new_match_record.removeAttr('id')
      new_match_record.attr('record-id', record.id)
      new_match_record.find('.match-record-id').text('#' + record.id)
      new_match_record.find('.match-record-domain').text(record.domain)
      new_match_record.find('.match-record-date').text(record.extra)
      new_match_record.insertBefore('#btn_add_record')

      if ($('#editing_id').text() == record.id) {
        new_match_record.attr('pressed', 'true')
      }
      new_match_record.click(on_click_match_record.bind(null, record))
    })
  }

})

function on_click_match_record(record) {
  console.log('click match record', record)
  $('.match-record-real').attr('pressed', 'false')
  $(`.match-record-real[record-id="${record.id}"]`).attr('pressed', 'true')

  setup_editing_record(record)
}


function init_editing_area() {

  $('#btn_add_record').click(on_click_add_record)

  $('.editing-tab').click(on_click_editing_tab)

  $('#btn_delete_editing').dblclick(() => {
    console.log('delete')
    electron.ipcRenderer.send('delete-record', parseInt($('#editing_id').text()))
    setup_editing_record(null)
  })

  $('#btn_reload').click(()=>{
    $('#webview').get(0).reload()
  })

  $('#btn_edit').click(() => {
    enter_editing()
  })
  $('#btn_normal').click(()=>{
    $('#webview').get(0).executeJavaScript(`_irr.rm_toggle_editing(false)`)
    store.set('is-readmode-on', false)
    $('#webview').get(0).executeJavaScript(`_irr.rm_refresh_readmode()`)
  })

  $('#btn_preview').click(() => {
    $('#webview').get(0).executeJavaScript(`_irr.rm_toggle_editing(false)`)
    store.set('is-readmode-on', true)

    $('#webview').get(0).executeJavaScript(`_irr.rm_refresh_readmode()`)
  })

  rmdef.fields.forEach((field, index) => {

    let new_editing_frame = $('#editing_frame_template').clone()
    new_editing_frame.attr('id', 'editing_frame_'+field.name)
    new_editing_frame.find('.btn-choose').click(on_click_choose_frame_field.bind(null, field))
    new_editing_frame.find('.btn-delete').click(on_click_delete_frame_field.bind(null, field))
    new_editing_frame.css('background', field.color)
    new_editing_frame.find('.frame-name').text(field.name)
    new_editing_frame.appendTo('#editing_area_frame')
  })

  $('#btn_start_choose_hidden').click(() => {
    enter_editing()
  })

  $('#btn_save_editing').click(on_click_save_editing)

  $('#editing_space input, #editing_space textarea').keyup(()=>{
    console.log('dirty')
    dirty()
  })

  $('#btn_load_this').click(()=>{
    let this_url = $('#editing_test_url').val().trim()
    if (this_url) {
      $('#webview').get(0).loadURL(this_url)
    }
  })

  $('#btn_use_current').click(()=>{
    let curr = $('#input_address').val().trim()
    $('#editing_test_url').val(curr)
    dirty()
  })

  $('#btn_inject_css').click( ()=>{
    let css = $('#input_inject').val().trim()
    $('#webview').get(0).insertCSS(css)
  })
}

function enter_editing() {
  store.set('is-readmode-on', false)
  $('#webview').get(0).executeJavaScript(`_irr.rm_refresh_readmode()`)
  $('#webview').get(0).executeJavaScript(`_irr.rm_toggle_editing(true)`)

  $('#webview').get(0).executeJavaScript(`_irr.rm_toggle_editing(true)`)

  rmdef.fields.forEach(field => {
    let csser = $('#editing_frame_' + field.name).find('input').val().trim()
    if (csser)
      $('#webview').get(0).executeJavaScript(`_irr.rm_init_editing_rule('${field.name}', '${csser}')`)
  })


  $('#editing_area_hidden .hidden-item-csser').each((index, element) => {
    let csser = $(element).text().trim()
    if (csser) $('#webview').get(0).executeJavaScript(`_irr.rm_init_hidden_rule('${csser}')`)
  })
}

function on_click_add_record() {
  console.log('add record')
  //增加record时候
  let new_record = {}
  new_record.domain = new URL($('#input_address').val()).hostname
  new_record.frame_cssers = ''
  new_record.hidden_cssers = ''
  new_record.inject_css = ''
  new_record.test_url = $('#input_address').val()
  new_record.date = Date.now()
  new_record.extra = ""

  electron.ipcRenderer.send('new-record', new_record)
}

electron.ipcRenderer.on('record-new', (event, new_record) => {
  console.log('record-new', new_record)

  setup_editing_record(new_record)
  refresh_rules_by_url(null)

  g_record_data_map[new_record.id] = new_record
  add_new_record_element(new_record, true)
})

electron.ipcRenderer.on('record-updated', (event, record) => {
  g_record_data_map[record.id] = record
  refresh_rules_by_url(null)

  let ele = g_record_element_map[record.id]
  if (ele) {
    ele.find('.record-domain').text(record.domain)
    ele.find('.record-extra').text(record.extra)
  }
})

function setup_editing_record(record) {
  console.log('setup_editing_record', record)

  $('#editing_id').text(record ? record.id : '')

  $('#editing_domain').val(record ? record.domain : '')
  $('#editing_extra').val(record ? record.extra : '')
  $('#editing_test_url').val(record ? record.test_url : '')

  let frame_words = record ? record.frame_cssers.split('#1#') : []
  while (frame_words.length < rmdef.fields.length) {
    frame_words.push('')
  }
  rmdef.fields.forEach((field, index) => {
    $('#editing_frame_' + field.name).find('input').val(frame_words[index])
  })


  let hidden_words = record ? record.hidden_cssers.split('#1#') : []
  $('#editing_area_hidden .hidden-item').remove()
  hidden_words.forEach(hidden_csser => {
    if (hidden_csser) add_new_hidden_csser(hidden_csser, false)
  })

  $('#input_inject').val(record.inject_css)
}

function on_click_editing_tab(event) {
  console.log(event)
  let this_tab = $(event.target)

  $('.editing-tab').attr('pressed', 'false')
  this_tab.attr('pressed', 'true')

  $('.editing-area').hide()
  $('#editing_area_' + this_tab.attr('data')).show()

  //当选择hidden的tab后自动进入hidden选择，选择其他tab时，则退出了
  if (this_tab.attr('data') == 'hidden') {
    $('#webview').get(0).executeJavaScript(`_irr.start_select_rm_item('hidden', '')`)
  } else {
    $('#webview').get(0).executeJavaScript(`_irr.start_select_rm_item('unset', '')`)
  }
}

electron.ipcRenderer.on('record-deleted', (event, record_id) => {
  refresh_rules_by_url(null)
  delete g_record_data_map[record_id]
  g_record_element_map[record_id].remove()
})

function on_click_choose_frame_field(field) {
  console.log('choose filed', field)
  enter_editing()
  $('#webview').get(0).executeJavaScript(`_irr.start_select_rm_item('frame', '${field.name}')`)
}

function on_click_delete_frame_field(field) {
  console.log('delete field', field)
  $('#editing_frame_'+field.name).find('input').val('')
  enter_editing()
  $('#webview').get(0).executeJavaScript(`_irr.rm_remove_frame('${field.name}')`)
  dirty()
}

electron.ipcRenderer.on('readmode-new-csser', (event, data) => {
  console.log('readmode-new-csser', data)

  if (data.type == 'frame') {
    $('#editing_frame_' + data.name).find('input').val(data.csser)
  }

  if (data.type == 'hidden') {
    add_new_hidden_csser(data.csser)
  }
  dirty()
})

function add_new_hidden_csser(hidden_csser, check_dulp = true) {
  let is_dulp = false
  if (check_dulp) {
    $('#editing_area_hidden .hidden-item').each((index, element) => {
      if ($(element).find('.hidden-item-csser').text() == hidden_csser) {
        is_dulp = true
      }
    })
  }
  if (!is_dulp) {
    let new_element = $('#hidden_item_template').clone()
    new_element.removeAttr('id')
    new_element.find('.hidden-item-csser').text(hidden_csser)
    new_element.find('.my-btn').click(on_click_delete_hidden_item.bind(null, new_element, hidden_csser))
    new_element.appendTo('#editing_area_hidden')
  }
}

function on_click_delete_hidden_item(element, csser) {
  element.remove()
  $('#webview').get(0).executeJavaScript(`_irr.rm_remove_hidden('${csser}')`)
  dirty()
}

function on_click_save_editing() {
  let record = {}
  record.id = parseInt($('#editing_id').text())
  record.domain = $('#editing_domain').val().trim()
  record.extra= $('#editing_extra').val().trim()

  let frame_cssers = []
  rmdef.fields.forEach(field => {
    frame_cssers.push($('#editing_frame_' + field.name).find('input').val().trim())
  })
  record.frame_cssers = frame_cssers.join('#1#')

  let hidden_cssers = []
  $('#editing_area_hidden .hidden-item-csser').each((index, element) => {
    hidden_cssers.push($(element).text().trim())
  })
  record.hidden_cssers = hidden_cssers.join('#1#')
  record.inject_css = $('#input_inject').val().trim()
  record.test_url = $('#editing_test_url').val().trim()
  record.date = Date.now()

  electron.ipcRenderer.send('update-record', record)

  $('#btn_save_editing').text('Save')
  $('#btn_save_editing').removeAttr("style")
}


function dirty() {
  $('#btn_save_editing').text('Save[*]')
  $('#btn_save_editing').css('font-size', '20px')
  $('#btn_save_editing').css('color', 'red')
}