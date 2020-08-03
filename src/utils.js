const getMediaType = require('./mediatype.js')

function dateFormat(fmt = 'yyyy-MM-dd hh:mm:ss', date = new Date()) {

  let o = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    'S+': date.getMilliseconds()
  };
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, String(date.getFullYear()).substr(4 - RegExp.$1.length));
  }
  for (let k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(String(o[k]).length)));
    }
  }
  return fmt;
};

function isFunction(param) {
  return typeof(param) === 'function'
}

function isObject(param) {
  return Object.prototype.toString.call(param) === '[object Object]'
}

function isRegExp(param) {
  return Object.prototype.toString.call(param) === '[object RegExp]'
}


function getContentType(suffix, encoding = 'charset=UTF-8') {
  let type = getMediaType(suffix)

  return encoding ? type + ';' + encoding : type
}

module.exports = {
  dateFormat,
  isFunction,
  isObject,
  isRegExp,
  getContentType
}