const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')
const querystring = require('querystring')
const {
  dateFormat,
  isFunction,
  isObject,
  isRegExp
} = require('./utils.js')
let config = require('./config.js')
const Middleware = require('./middleware.js')

class SimpleServer {
  constructor(customConfig) {
    this.config = Object.assign({}, config, customConfig)
    this.request = null
    this.response = null
    this.lessRoutes = []

    for (let k in this.config) {
      this[k] = this.config[k]
    }
    this.lessRoutesInit()
    this.middleware = new Middleware()
  }

  use(fn) {
    if(!this.middleware) {
      throw new Error('Missing Middleware')
    }
    this.middlewares.push(fn)
  }

  send(data, statusCode, statusMessage, encoding) {
    this.response.statusCode = statusCode || 200
    this.response.statusMessage = statusMessage || ''
    this.response.end(data, encoding)
  }

  /**
   * 初始化路由正则匹配
   */
  lessRoutesInit() {
    if (Array.isArray(this.lessRoutes) && this.lessRoutes.length > 0) {
      this.lessRoutes = this.lessRoutes.map(item => {
        return {
          url: item.url,
          regExp: isRegExp(item.url) ? item.url : new RegExp('^' + item.url + '$'),
          fun: item.fun,
          simple: item.simple === undefined ? true : Boolean(simple)
        }
      })
    }
  }

  /**
   * 如果有路由匹配项就处理返回
   * @param {*} request 
   * @param {*} response 
   */
  matchLessRoute(request, response) {
    let lessRoutes = this.lessRoutes
    let url = request.url

    for (let i = 0, len = lessRoutes.length; i < len; i++) {
      if (lessRoutes[i].regExp.test(url)) {
        this.sendMatchedLessRoute(request, response, lessRoutes[i])
        return true
      }
    }
    return false
  }

  /**
   * 根据匹配到的路由对象，返回结果
   * @param {*} request 
   * @param {*} response 
   */
  async sendMatchedLessRoute(request, response, route) {
    let {
      simple,
      fun
    } = route

    try {
      if (isFunction(fun)) {
        if (simple) {
          let data = await fun(request)

          this.send(JSON.stringify(data))
        } else {
          fun(request, response)
        }
      } else {
        this.send(JSON.stringify(fun))
      }
    } catch (err) {
      console.error(err)
      this.send('', 500, err.message)
    }
  }

  /**
   * 打开代理请求
   * @param {*} option 
   * @param {*} response 
   */
  openProxyRequest(request, response, option) {
    let proxyRequest = http.request(option, proxyResponse => {
      let data = ''

      proxyResponse.on('data', (chunk) => {
        data += chunk
      })
      proxyResponse.on('end', () => {
        this.send(data)
      })
      response.writeHead(proxyResponse.statusCode, proxyResponse.headers)
    })

    proxyRequest.end(request.body, 'binary')

    proxyRequest.on('error', (err) => {
      this.send('', 502, err.message)
    })
    return proxyRequest
  }

  /**
   * 获取代理请求配置项
   * @param {*} matched 
   * @param {*} request 
   */
  getProxyOption(matched, request) {
    let {
      target,
      referer,
      pathRewrite
    } = matched
    let {
      url,
      method,
      headers
    } = request
    new RegExp('^(https?\:)\/\/(.+?)(?:\:(\\d+))??$', 'ig').test(target)
    let protocol = RegExp.$1
    let host = RegExp.$2
    let port = RegExp.$3

    // 如果存在配置项，就匹配并重写url
    if (isObject(pathRewrite)) {
      let keys = Object.keys(pathRewrite)

      if (keys.length > 0) {
        keys.forEach(regStr => {
          url = url.replace(new RegExp(regStr), pathRewrite[regStr])
        })
      }
    }

    if (referer) {
      headers.host = host
      headers.referer = target + url
    }

    let options = {
      protocol,
      host,
      port,
      method,
      path: url,
      headers
    }
    return options
  }

  /**
   * 代理请求
   * @param {*} request 
   * @param {*} response 
   */
  matchProxy(request, response) {
    let proxyConfig = this.proxyConfig
    let url = request.url

    for (let regStr in proxyConfig) {
      let reg = new RegExp(regStr)

      if (reg.test(url)) {
        let option = this.getProxyOption(proxyConfig[regStr], request)
        this.openProxyRequest(request, response, option)
        return true
      }
    }
    return false
  }

  /**
   * 静态资源请求
   * @param {*} request 
   * @param {*} response 
   */
  matchStatic(request, response) {
    let staticPath = this.staticPath
    let url = request.url
    let filePath = ''

    if (url === '/') {
      filePath = path.join(staticPath, '/index.html')
    } else {
      filePath = path.join(staticPath, url)
    }

    try {
      // 检查文件是否存在，存在就继续读取流
      fs.accessSync(filePath, fs.constants.F_OK);

      let stream = fs.createReadStream(filePath, {
        // encoding: 'utf8'
      })
      stream.pipe(response)
      stream.on('error', error => {
        this.send('', 500, error.message)
      })
      return true
    } catch (err) {}
    return false
  }

  acceptRequest(request, response, next) {
    let data = ''
    request.on('data', chunk => {
      data += chunk
    })
    request.on('end', () => {
      request.body = data
      let params = querystring.parse(data.toString())
      request.params = params
      next(request, response)
    })
  }

  start() {
    let {
      log,
      port,
      proxyOpen
    } = this
    const server = http.createServer((request, response) => {
      this.request = request
      this.response = response

      try {
        let urlObj = url.parse(request.url, true)

        for (let k in urlObj) {
          if (urlObj.hasOwnProperty(k)) {
            request[k] = urlObj[k]
          }
        }

        if (log) {
          console.log(dateFormat(), '\x1B[32m', request.url, '\x1B[39m')
        }

        if (this.matchStatic(request, response)) {
          return
        }

        this.acceptRequest(request, response, () => {
          if (this.matchLessRoute(request, response)) {
            return
          }

          if (proxyOpen) {
            if (this.matchProxy(request, response)) {
              return
            }
          }
          this.send('404', 404, 'not Found')
        })

      } catch (err) {
        console.error(err)
        this.send('500', 500, err.message)
      }
    })

    this.server = server

    server.listen(port || 3000, () => {
      console.log('\x1B[32m%s\x1B[39m', 'The proxy server is running...')
    })

    return this
  }
}

module.exports = SimpleServer