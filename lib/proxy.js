/**
 * @file: proxy.js
 *
 * @author: ccx
 *
 * @date: 2016-06-30 15:46:12
 *
 * @description: 将当前请求代理到配置的远端服务器
 */

var config;
var http = require('http-debug').http;
var https = require('http-debug').https;
var fs = require('fs');
var url = require('url');
var path = require('path');
var mock_cache = require('./mock-cache');



/**
 * @method proxy
 *
 * @param {Object} req http请求对象
 *
 * @param {Object} res http响应对象
 *
 * @param {Function} next callback函数
 *
 * @description: 代理http请求到远端
 */
function proxy(req, res, next) {
    var ROUTER = config.router;
    var COOKIE = config.cookie;
    // var AUTO_INDEX = config.autoIndex ? config.autoIndex.split(/\x20+/) : ['index.html']
    //保证路径完整
    var TARGET_SERVER = config.server.replace(/([^\/])$/, '$1/');
    var urlParsed = url.parse(req.url);
    var filePath = resolveFilePath(config.staticFileRootDirPath, urlParsed.pathname);
    // set up forward request
    var headers = req.headers;
    headers.cookie = COOKIE || redeemCookieFromJar(config.jar.getCookies(TARGET_SERVER));
    // headers.host = config.host;
    // console.info("headers.cookie", headers.cookie)
    delete headers['x-requested-with'];
    var requestPath = router(urlParsed.path, ROUTER);
    // console.info('requestPath:', requestPath);
    var urlOptions = {
        host: url.parse(TARGET_SERVER).hostname,
        port: url.parse(TARGET_SERVER).port,
        path: requestPath,
        method: req.method,
        headers: headers,
        rejectUnauthorized: false
    };

    // proxy to target server
    var forwardUrl = url.resolve(TARGET_SERVER, requestPath);
    // log forwarding message
    console.info('fowarding', filePath.red, 'to', forwardUrl.cyan);
    var httpOrHttps = url.parse(TARGET_SERVER).protocol === 'http:' ? http : https;
    var forwardRequest = httpOrHttps.request(urlOptions, function (response) {
        // set headers to the headers in origin request
        res.writeHead(response.statusCode, response.headers);
        response.on('data', function (chunk) {
            // body += chunk;
            // console.info('proxy data', chunk.toString('utf8'))
            res.write(chunk);
        });

        response.on('end', function () {
            res.end();
        });
    });

    if (config.mock_cache && typeof config.mock === 'object' && typeof config.mock.map === 'object') {
        mock_cache(config, forwardUrl, filePath);
    }

    if (req._body) {
        forwardRequest.write(JSON.stringify(req.body));
    }

    forwardRequest.on('error', function (e) {
        console.error('problem with request: ' + e.message);
    });

    req.addListener('data', function (chunk) {
        forwardRequest.write(chunk);
    });

    req.addListener('end', function () {
        forwardRequest.end();
    });
}



/**
 * resolve static file path,, take care of welcome file
 *
 * @param {string} staticFileRootDirPath  RootDirPath
 *
 * @param {string} pathname pathname
 *
 * @return {string} working path
 */
function resolveFilePath(staticFileRootDirPath, pathname) {
    if (pathname === '/') { // resolve welcome file
        return path.join(staticFileRootDirPath, 'index.html');
    }
    return path.join(staticFileRootDirPath, pathname);
}




/**
 * get the normalized cookie from jar
 *
 * @param  {Array} cookieArray cookies
 *
 * @return {string} cookie string used in headers
 */
function redeemCookieFromJar(cookieArray) {
    var result = '';
    for (var i = 0; i < cookieArray.length; i++) {
        result += cookieArray[i].key + '=' + cookieArray[i].value + ';';
        if (i !== cookieArray.length - 1) {
            result += ' ';
        }
    }
    return result;
}



/**
 * @method router
 *
 * @param {string} url 需要匹配的url
 *
 * @param {Object} router config中配置的router规则
 *
 * @description: 将当前请求的地址使用到匹配的路由地址替换，多条规则就使用最后一条配置的规则进行替换
 */
function router(url, router) {
    var path = '';
    var reg;
    if (router) {
        for (var i in router) {
            reg = new RegExp(i);
            if (reg.test(url)) {
                path = url.replace(reg, router[i]);
                console.log('special route mapping found! converting...', url, 'to', path);
            }
        }
    }
    else {
        path = url;
    }
    return path;
}

module.exports = function (_config) {
    config = _config;
    return proxy;
};
