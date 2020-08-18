# simple-less-server

用于开发静态页面的简单服务器。您可以启用代理请求，也可以自定义路由返回数据

A simple server for developing static pages. You can enable proxy requests, or you can customize the route to return data

+ 使用场景是，在开发几个轻量级页面的时候，简单配置就可以启用一个服务器
+ 这是一个与http请求方法无关的服务器，如果需要验证，你可以在路由函数中使用request.method进行自定义处理
+ 调用start后，路由的path如果是字符串会被处理成正则对象
+ 监听到请求后，会按序遍历路由，请求的url通过验证后就会停止遍历并执行路由函数

## 处理优先级
静态目录 > 代理拦截 > routeUse添加的路由 > 最后404

## Install
```
npm i simple-less-server
```

## use:
```
let app = server({
  port: 3000, //本地服务器启动端口
  log: true, //是否在控制台打印请求地址
  staticPath: __dirname, //静态资源目录,
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
    func: (request, response) => {response.body = 'hello world!'}
  }] //路由
})

//第二种路由初始化方法
// 简单的服务器,将结果写在body上，最后response.end()会把body上的数据写在里面
// 或者直接用response.json(data)方法格式化传参生成json字符串返回
app.routeUse('/api/test', (request, response) => {
    response.body = "The request name is '"+ request.url +"'"
})
app.routeUse('/api/getList', (request, response) => {
    response.status(200)
    response.json({list: [1, null, true, 'abc', '文字']})
})

app.start()
```

## request

属性
+ url url
+ hostname 域名
+ port 端口
+ path 请求路径
+ query url上的参数
+ params body上的参数

## response

response.status() 设置返回的状态码
response.json() 设置返回的json字符串
