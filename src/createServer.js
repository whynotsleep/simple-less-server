const http = require('http');
const https = require('https');
const fs = require('fs');
const {
    isFunction,
} = require('./utils.js')
const log = require('./log')

function createHttpServer(config, callback) {
    isFunction(config) && (callback = config);

    const listenCallback = isFunction(config.listenCallback) ? config.listenCallback : () => {
        console.log('\x1B[32m%s\x1B[39m', 'http server is running at port ' + config.port + '...')
    }
    return http.createServer(config.options, callback).listen(config.port, listenCallback);
}

function createHttpsServer(config, callback) {
    let key = ''
    let cert = ''

    if (isFunction(config)) {
        callback = config
        config = {}
    } else {
        config = config || {}
    }

    const listenCallback = isFunction(config.listenCallback) ? config.listenCallback : () => {
        console.log('\x1B[32m%s\x1B[39m', 'https server is running at port ' + config.port + '...')
    }

    // 读取https证书
    try {
        if (config.key) {
            key = fs.readFileSync(config.key)
        } else {
            log('https需要设置证书key地址')
        }

        if (config.cert) {
            cert = fs.readFileSync(config.cert)
        } else {
            log('https需要设置证书cert地址')
        }
    } catch (err) {
        log('https证书读取错误')
    }

    return https.createServer({
        key,
        cert,
        ...config.options
    }, callback).listen(config.port, listenCallback);
}

module.exports = {
    createHttpServer,
    createHttpsServer
}