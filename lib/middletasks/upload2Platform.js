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
var url = require('url');
var urlsHasReport = [];
var platformUrl;

/**
 * @method upload2PlantForm
 *
 * @param {Object} req 原始请求对象
 *
 * @param {Object} res http响应对象
 *
 * @param {Function} reslove Promise reslove
 *
 * @param {Function} reject Promise reject
 *
 * @description: 上传接口数据到plantform
 */
function upload2PlantForm(req, res, reslove, reject, chunk, reqChunk) {
    var result;
    var options = {
        host: platformUrl.hostname,
        port: platformUrl.port,
        path: platformUrl.path,
        headers: res._headers,
        method: 'POST'
    };
    // 只上报JSON数据
    if (options.hostname && isJSONRequest(res._headers['content-type']) && !~urlsHasReport.indexOf(req.url)) {
        var request = http.request(options, function (res) {
            // console.log('STATUS: ' + res.statusCode);
            res.setEncoding('utf8');
            res.on('data', function (_chunk) {
                console.info('BODY: ', _chunk.toString('utf8'));
            });
            res.on('end', function () {
                // console.info('request headers', res.headers);
                console.info('report end: ', res);
                urlsHasReport.push(req.url);
                reslove();
            });
            res.on('error', function (error) {
                // reject(error);
                console.info('report error', error);
                reslove(error);
            });
        });

        request.setHeader('x-data-url', path.join(config.server, req.url));
        // if (isJSONRequest(res._headers['content-type'])) {
        // chunk = chunk[0];
        result = createReqBody(
            config.projectId || config.name,
            path.join(config.server, req.url),
            req.query, // GET query
            JSON.parse((chunk || new Buffer(0)).toString(getEncode(res._headers['content-type'])))
        );
        if (req.method === 'POST') {
            result.dataSchema = JSON.parse((reqChunk || new Buffer(0)).toString('utf8'));
        }
        console.info('report data', result);
        request.write(JSON.stringify(result));
        // }
        // write data to request body
        // for (var i = 0; i < chunk.length; i++) {
        //     request.write(chunk[i]);
        // }
        request.end();
    }
    else {
        reslove();
    }
}

/**
 * @method getEncode
 *
 * @param {string} contentType header的content-type
 *
 * @return {string}
 *
 * @description: 根据header的content-type获取数据类型
 */
function getEncode(contentType) {
    var lcStr = (contentType || '').toLocaleLowerCase();
    if (~lcStr.indexOf('utf-8')) {
        return 'utf8';
    }
    return 'utf8';
}

/**
 * @method isJSONRequest
 *
 * @param {string} contentType header的content-type
 *
 * @return {bool}
 *
 * @description: 根据header的content-type判断数据是否为JSON
 */
function isJSONRequest(contentType) {
    var lcStr = (contentType || '').toLocaleLowerCase();
    return lcStr.indexOf('application/json') > -1;
}

/**
 * @method createReqBody
 *
 * @param {string} name 项目对应的
 *
 * @param {string} path 数据的原始请求path
 *
 * @param {Object} reqData request的原始数据
 *
 * @param {Object} resData server的开发数据
 *
 * @return {Object}
 *
 * @description: 构建上报数据体
 */
function createReqBody(name, path, reqData, resData) {
    return {
        name: name,
        path: path,
        dataSchema: reqData,
        dataResponseSchema: resData
    };
}


module.exports = function (_config) {
    config = _config;
    platformUrl = url.parse(config.platformUrl || '');
    return {
        type: 'response',
        processer: upload2PlantForm
    };
};
