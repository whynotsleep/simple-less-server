# simple-less-server

用于开发静态页面的简单服务器。您可以启用代理请求，也可以自定义请求以返回数据

A simple server for developing static pages. You can enable proxy requests, or you can customize requests to return data

接受到的请求暂时不会验证请求方法,例如get post patch等
使用场景是，在开发几个简单的没有太多要求页面的时候，轻松配置一下就可以用服务器打开页面，简单写调用几个方法，就可以模拟真正接口获取数据，方便调试

优先级：
配置的静态目录 > 配置的代理拦截 > routeUse添加的服务路由 > 最后404

use:
```
let app = server({
  port: 3000, //本地服务器启动端口
  log: true, //是否在控制台打印请求地址
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
  lessRoutes: [{ //第一种路由初始化方法
    path: '/hello', //路由地址
    func: (request, response) => {response.body = '直接写在配置项中的路由方法'}
  }] //路由
})

//第二种路由初始化方法
// 简单的服务器,将结果写在body上，最后response.end()会把body上的数据写在里面
// 或者直接用response.json(data)方法格式化传参生成json字符串返回
app.routeUse('/api/test', (request, response) => {
    response.body = "The request name is '/api/test'"
})
app.routeUse('/api/getList', (request, response) => {
    response.status(200)
    response.json({list: [1,2,3,4,5]})
})

app.start()
```


