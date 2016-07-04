/**
 * @file: upload2PlatForm.js
 *
 * @author: swr
 *
 * @date: 2016-07-04 02:54:24
 *
 * @description: 在response关闭前上报数据到platform
 */
var config;
var http = require('http-debug').http;
var path = require('path');

/**
 * @method upload2PlantForm
 *
 * @param {Object} req 原始请求对象
 *
 * @param {Object} res http响应对象
 *
 * @param {Function} resolve Promise resolve
 *
 * @param {Function} reject Promise reject
 *
 * @description: 上传接口数据到plantform
 */
function upload2PlantForm(req, res, resolve, reject, chunk) {

    // console.info('upload2PlantForm', chunk);
    var options = {
        host: 'origin.eux.baidu.com',
        port: 8000,
        path: '/report',
        headers: res._headers,
        method: 'POST'
    };
    var request = http.request(options, function (res) {
        // console.log('STATUS: ' + res.statusCode);
        // console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
        });
        res.on('end', function (chunk) {
            // console.info('request headers', res.headers);
            resolve();
        });
        res.on('error', function (error) {
            reject(error);
        });
    });

    request.setHeader('x-data-url', path.join(config.server, req.url));
    // write data to request body
    for (var i = 0; i < chunk.length; i++) {
        request.write(chunk[i]);
    }
    request.end();
}


module.exports = function (_config) {
    config = _config;
    return {
        type: 'response',
        processer: upload2PlantForm

    };
};
