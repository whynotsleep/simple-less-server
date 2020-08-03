let config = {
  port: 3000, //本地服务器启动端口
  log: true, //是否在控制台打印请求地址
  staticPath: __dirname, //静态资源目录
  proxyOpen: true, //代理是否开启
  proxyConfig: {}, //需要代理的目标
  lessRoutesCache: [] //路由
}

module.exports = config