const {
    dateFormat
} = require('./utils.js')

module.exports = function (msg) {
    console.log(dateFormat(), '\x1B[32m', msg, '\x1B[39m')
}