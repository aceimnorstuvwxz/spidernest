const electron = require('electron')

window._irr = {}

_irr.log = (data) => {
    electron.ipcRenderer.send('log', data)
}
_irr.tell_result = (result_data) => {
    electron.ipcRenderer.send('cmd', { cmd: 'worker-webview-result', data: result_data })
}

document.addEventListener('DOMContentLoaded', function () {
    _irr.$ = require('./libs/jquery.js') //jquery必须在dom后加载，因为它需要去解析dom
})

HTMLElement.prototype.addEventListener = function () {} //让对方无法添加事件的那啥，可能能降低能耗

_irr.check_with_html = (target_id, csser) => {
    console.log('check with html', target_id, csser)

    window.close()
}