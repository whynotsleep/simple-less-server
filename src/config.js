let config = {
  http: {
    open: true,
    port: 3000,
    option: {}
  },
  https: {
    open: true,
    port: 3443,
    key: './key.pem', //https证书私钥
    cert: './cert.pem', //https证书
    option: {}
  },
  log: true, //是否在控制台打印请求地址
  staticPath: __dirname, //静态资源目录
  proxyOpen: true, //代理是否开启
  proxyConfig: {}, //需要代理的目标
  lessRoutesCache: [] //路由
}

module.exports = config