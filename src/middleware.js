const {
  isFunction
} = require('./utils.js')

class Middleware {
  constructor() {
    this.middlewares = []
  }

  use(fns) {
    if (Array.isArray(fns)) {
      fns.forEach(fn => {
        if (!isFunction(fn)) {
          throw new Error('middleware must be a function!')
        }
        this.middlewares.push(fn)
      })
    } else if (isFunction(fns)) {
      this.middlewares.push(fns)
    }

    return this
  }

  hander(context, next) {
    let middlewares = [...this.middlewares]
    let index = -1
    return dispatch(0)

    function dispatch(i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middlewares.length === 0 ? next : middlewares.shift()

      if (!fn) return Promise.resolve()

      try {
        let result = fn(context, dispatch.bind(null, i + 1))
        return Promise.resolve(result)
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}

module.exports = Middleware