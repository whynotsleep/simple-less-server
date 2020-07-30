const SimpleServer = require('./src/simple-proxy-server')
module.exports = (config) => {
    return new SimpleServer(config).start()
}