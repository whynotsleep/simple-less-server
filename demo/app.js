const server = require('../index.js')
const path = require('path')

app = server({
  port: 3000, //本地服务器启动端口
  log: true, //是否在控制台打印请求地址
  http: {
    open: true,
    port: 3000,
    option: {}
  },
  https: {
    open: true,
    port: 3443,
    key: path.join(__dirname, './key.pem'),
    cert: path.join(__dirname, './cert.pem'),
    option: {}
  },
  staticPath: __dirname, //静态资源目录
  proxyOpen: true, //代理是否开启
  proxyConfig: { //需要代理的目标对象，请求地址有/api都会代理，权重
    '/api': {
      target: 'http://127.0.0.1:3001', //代理的目标地址
      referer: true, //是否代理修改请求的来源为代理地址，会修改请求头的referer,Host为本地服务器地址
      pathRewrite: { //重写
        '^/api': ''
      }
    }
  },
  lessRoutesCache: [{ //第一种路由初始化方法
      path: '/hello', //路由地址
      func: (request, response) => {
        response.body = 'hello world!'
      }
    },
    { //第一种路由初始化方法
      path: '/text', //路由地址
      func: (request, response) => {
        response.body = '一段中文文字'
      }
    }
  ]
})

app.routeUse('/test', (request, response) => {
  response.body = "The request name is '/api/test'"
})
app.routeUse('/getList', (request, response) => {
  response.status(200)
  response.json({
    list: [1, null, true, 'abc', '文字']
  })
})

app.routeUse('/error', (request, response) => {
  response.status(500)
  response.body = 'server error...'
})

app.start()