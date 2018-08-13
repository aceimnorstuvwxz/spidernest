//shallow.js 
//在原生js上构建的一些常用方法，作为jquery的代替
//仅支持现代浏览器，精简高性能
//(C)2018 netqon.com

let shallow = {}

shallow.add_class = (csser, class_name)=>{
    document.querySelectorAll(csser).forEach((element)=>{
        element.classList.add(class_name)
    })
}

shallow.remove_class = (csser, class_name)=>{
    document.querySelectorAll(csser).forEach((element)=>{
        element.classList.remove(class_name)
    })
}
exports = module.exports = shallow