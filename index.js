const SimpleLessServer = require('./src/simple-less-server')
module.exports = (config) => {
    return new SimpleLessServer(config)
}