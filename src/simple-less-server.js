const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')
const querystring = require('querystring')
const {
  dateFormat,
  isObject,
  isFunction,
  isRegExp,
  getContentType
} = require('./utils.js')
let config = require('./config.js')
const Middleware = require('./middleware.js')

function setContentType(suffix, encoding) {
  let type = getContentType(suffix, encoding)
  this.setHeader('Content-type', type)
}

function json(data) {
  this.setContentType('.json')
  this.body = JSON.stringify(data)
}

function status(code = 200) {
  this.statusCode = code
  if (code == 404) {
    this.statusMessage = 'not Found'
  }
}


class SimpleLessServer {
  constructor(customConfig) {
    this.config = Object.assign({}, config, customConfig)
    this.request = null
    this.response = null
    this.lessRoutesCache = []
    this.lessRoutes = []

    for (let k in this.config) {
      this[k] = this.config[k]
    }
    this.init()
  }

  init() {
    this.mainProcessMiddleware = new Middleware()

    this.use(async (ctx, next) => {
      return await this.acceptRequest(ctx, next)
    })

    this.use(async (ctx, next) => {
      return await this.matchStatic(ctx, next)
    })

    this.use(async (ctx, next) => {
      return await this.matchProxy(ctx, next)
    })

    this.use(async (ctx, next) => {
      return await this.matchLessRoute(ctx, next)
    })

    return this
  }

  use(fn) {
    if (!this.mainProcessMiddleware) {
      throw new Error('Missing mainProcessMiddleware')
    }
    this.mainProcessMiddleware.use(fn)
    return this
  }

  routeUse(path, func) {
    this.lessRoutesCache.push({
      path,
      func
    })
    return this
  }

  send(data, statusCode, statusMessage, encoding) {
    this.response.statusCode = statusCode || 200
    this.response.statusMessage = statusMessage || ''
    this.response.end(data, encoding)
    return this
  }

  /**
   * 打开代理请求
   * @param {*} option 
   * @param {*} response 
   */
  openProxyRequest(request, response, option) {
    return new Promise((resolve, reject) => {
      let proxyRequest = http.request(option, proxyResponse => {
        let data = []

        proxyResponse.on('data', (chunk) => {
          data.push(chunk)
        })
        proxyResponse.on('end', () => {
          response.body = data.join('')
          resolve()
        })
        response.writeHead(proxyResponse.statusCode, proxyResponse.headers)
      })

      proxyRequest.end(request.body, 'binary')

      proxyRequest.on('error', (err) => {
        reject(err)
      })
    })
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
    let targetParse = url.parse(target || '')
    let protocol = targetParse.protocol
    let host = targetParse.hostname
    let port = targetParse.port

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
   * @param {*} ctx 
   * @param {*} next 
   */
  async matchProxy(ctx, next) {
    let {
      request,
      response
    } = ctx
    let proxyConfig = this.proxyConfig
    let url = request.url

    if (isObject(proxyConfig)) {
      for (let regStr in proxyConfig) {
        let reg = new RegExp(regStr)

        if (reg.test(url)) {
          let option = this.getProxyOption(proxyConfig[regStr], request)
          return await this.openProxyRequest(request, response, option)
        }
      }
    }

    return await next()
  }

  /**
   * 接收请求数据
   * @param {*} request 
   */
  acceptRequestData(request) {
    return new Promise((resolve, reject) => {
      let data = []
      request.on('data', chunk => {
        data.push(chunk)
      })

      request.on('end', () => {
        resolve(data.join(''))
      })
      request.on('error', (err) => {
        reject(err)
      })
    })
  }

  /**
   * 格式化请求参数
   * @param {*} ctx 
   * @param {*} next 
   */
  async acceptRequest(ctx, next) {
    let request = ctx.request
    let urlObj = url.parse(request.url, true)

    try {
      for (let k in urlObj) {
        if (urlObj.hasOwnProperty(k)) {
          request[k] = urlObj[k]
        }
      }

      let data = await this.acceptRequestData(ctx.request)

      request.body = data
      request.params = querystring.parse(data)
      return await next()
    } catch (err) {
      console.error(err)
      return err
    }
  }

  async readFile(response, filepath) {
    return new Promise((resolve, reject) => {
      try {
        let stat = fs.statSync(filepath)

        // 检查路径是否是文件，是就继续读取流
        if (stat.isFile()) {
          let readStream = fs.createReadStream(filepath, {
            // encoding: 'binary'
          })
          let suffix = path.extname(filepath)

          setContentType.call(response, suffix)
          readStream.pipe(response)
          readStream.on('error', err => {
            reject(err)
          })
        } else {
          reject(err)
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * 静态资源请求
   * @param {*} ctx 
   * @param {*} next 
   */
  async matchStatic(ctx, next) {
    let staticPath = this.staticPath
    let filepath = ctx.request.path

    if (filepath === '/') {
      filepath = path.join(staticPath, '/index.html')
    } else {
      filepath = path.join(staticPath, filepath)
    }

    try {
      return await this.readFile(ctx.response, filepath)
    } catch (err) {
      // console.error(err)
    }
    return await next()
  }

  /**
   * 初始化路由正则匹配
   */
  lessRoutesInit() {
    this.routeUse(/^.*$/, async (request, response) => {
      response.statusCode = 404
      response.statusMessage = 'not Found'
      try {
        await this.readFile(response, path.join(__dirname, './404.html'))
      } catch (err) {
        response.statusCode = 'The page not Found'
      }
    })

    if (Array.isArray(this.lessRoutesCache) && this.lessRoutesCache.length > 0) {
      this.lessRoutes = this.lessRoutesCache.map(item => {
        let {
          path,
          func
        } = item

        return {
          path,
          regExp: isRegExp(path) ? path : new RegExp('^' + path + '$'),
          func
        }
      })
    }
  }

  /**
   * 如果有路由匹配项就处理返回
   * @param {*} ctx 
   * @param {*} next 
   */
  async matchLessRoute(ctx, next) {
    let lessRoutes = this.lessRoutes
    let {
      request,
      response
    } = ctx

    for (let i = 0, len = lessRoutes.length; i < len; i++) {
      let {
        regExp,
        func
      } = lessRoutes[i]

      if (regExp.test(request.pathname)) {
        setContentType.call(response, '.txt')
        if (isFunction(func)) {
          return await func(request, response)
        } else {
          return Promise.resolve()
        }
      }
    }
    return await next()
  }

  start(callback) {
    let {
      log,
      port,
    } = this

    this.lessRoutesInit()

    const server = http.createServer((request, response) => {
      this.request = request
      this.response = response

      response.status = status.bind(response)
      response.json = json.bind(response)
      response.setContentType = setContentType.bind(response)

      this.ctx = {
        request,
        response
      }

      if (log) {
        console.log(dateFormat(), '\x1B[32m', request.url, '\x1B[39m')
      }

      request.on('error', err => {
        this.send(err.message, 500)
      })

      this.mainProcessMiddleware.hander(this.ctx).then(res => {
          this.response.end(this.response.body)
        })
        .catch(err => {
          console.error(err)
          this.send(err.message, 500)
        })
    })

    this.server = server

    callback = isFunction(callback) ? callback : () => {
      console.log('\x1B[32m%s\x1B[39m', 'The proxy server is running...')
    }

    server.listen(port || 3000, callback)

    return this
  }
}

module.exports = SimpleLessServer