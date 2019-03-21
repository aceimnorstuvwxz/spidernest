
//迷行了，不到万不得已，总是有基于Protocal的方法的，而不要使用这种模拟点击的方式！！！！



const fs = require('fs')
const result_fn = "dist/ppf_result.txt"
function append(path, title, post_title, is_query, is_end, A, B, C,D) {
    let dd = [path, title, post_title, is_query, is_end, A,B,C,D]

    fs.appendFileSync(result_fn, dd.join(',_,'));
}


let g_webview = null
const ppf_url = "http://lawauto.jnpinno.com/app/customer/index.html"
let g_queue = [{
    path:''
}]
setTimeout(() => {
    //start
    g_webview = $('webview').get(0)
    g_webview.openDevTools()
    g_webview.addEventListener('ipc-message', event => {
        console.log(event.channel)
        on_webview_data(event.channel)
    })

    setTimeout(() => {
        do_next()
    }, 1000);

}, 1000);

function reload() {
    g_webview.loadURL(ppf_url)
}

function get_url() {
    return g_webview.getURL()
}

function do_next() {
    if (g_queue.length > 0) {
        let item = g_queue[0]
        g_queue.shift()
        check_item(item)

    } else {
        console.log('all done, g_queue empty!')
    }
}

function check_item(item) {
    //每次检查一个路径，都要先重置地址
    reload()
    path = item.path

    let delay = 2 //给load
    //然后把之前的路径走完
    for(let i = 0; i < path.length; i++) {
        let step = path[i]
        delay += 2
        setTimeout(do_step.bind(null, step), delay * 1000);
    }

    delay += 2
    setTimeout(check_result.bind(null, item), delay * 1000);


}

function step2index(step) {
    return step.charCodeAt(0)-65;
}

function do_step(step) {
    console.log('do step=', step)
    //TODO
    let index = step2index(step)
    g_webview.executeJavaScript(`_irr.do_step(${index})`)
}

function check_result(item) {

    let current_url = get_url()
    console.log(current_url)

    g_current_item = item
    g_webview.executeJavaScript(`_irr.get_inner_data()`)
}

let g_current_item = null
function on_webview_data(data) {
    //获取post_title存储当前item
    if (g_current_item.path.length > 0) {
        //非首页时，需要存储
        append(g_current_item.path, g_current_item.title, data.post_title, data.is_query, data.is_end, data.A, data.B, data.C, data.D)
    }
    
    //只留第一个，开发时更快进入下一级
    if (data.subs.length > 0) {
        data.subs = [data.subs[0]]
    }

    data.subs.forEach(sub=>{
        let item = {
            title: sub.title,
            path: g_current_item.path + sub.step
        }
        g_queue.push(item)
        console.log(sub)

    })
    do_next()
}