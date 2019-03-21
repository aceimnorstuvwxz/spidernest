
const electron = require('electron')

window._irr = {}

_irr.tell_host = (data)=>{
    console.log('tell host', data)
    electron.ipcRenderer.sendToHost(data)
}

function index2step(index){
    return String.fromCharCode(65+index) //A
}

_irr.click_at_element = (element) => {
    let clickEvent = new MouseEvent("click", {
        "view": window,
        "bubbles": true,
        "cancelable": false
      });
    
    element.dispatchEvent(clickEvent)
}

_irr.do_step = (index)=>{
    //进入第index条
    let current_url = window.location.href

    if (current_url.endsWith('html')) {
        //首页
        let element = $('div[data-xp-class="AOSpot"]').get(index)
        _irr.click_at_element(element)
    }
}

_irr.get_inner_data = ()=>{
    console.log("get sub items")

    let current_url = window.location.href

    let ret = {
        post_title: '',
        is_query: false,
        is_end: false,
        A:'',
        B:'',
        C:'',
        D:'',
        subs:[]
    }
    if (current_url.endsWith('html')) {
        //首页
        $('div[data-xp-class="AOSpot"]').each((index, element)=>{
            let jele = $(element)
            let title = jele.attr('data-xp-name')
            let step = index2step(index)
            ret.subs.push({
                title: title,
                step: step
            })
        })
    } else if (current_url.endsWith('modal2')) {
        //问题选择
    }

    _irr.tell_host(ret)
}