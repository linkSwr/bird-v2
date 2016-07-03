/**
 * @file: change-user.js
 *
 * @author: ccx
 *
 * @date: 2016-06-30 15:07:58
 *
 * @description: 用于在 bird 本地 server 端处理替换当前用户信息的请求
 */
var config;
var url = require('url');
var BIRD_CHANGE_USER_PATHNAME = '/bbbbiiiirrrrdddd';
var request = require('request');



/**
 * @method changeUser
 *
 * @param {Object} req http请求对象
 *
 * @param {Object} res http响应对象
 *
 * @param {Function} next callback函数
 *
 * @description: 处理更换代理用户信息的请求
 */
function changeUser(req, res, next) {
    var urlParsed = url.parse(req.url);
    // 接受到指定请求就替换用户信息
    if (urlParsed.pathname === BIRD_CHANGE_USER_PATHNAME) {
        var username = urlParsed.query.split('=')[1];
        config.username = username;
        config.jar = request.jar();
        config.auth(config, config.jar).then(function () {
            console.info(config.server + ' user switched to ', username.black.bgWhite);
            res.write('changed');
            res.end();
        });
    }
    else {
        next();
    }
}

module.exports = function (_config) {
  config = _config;
  return changeUser;
}