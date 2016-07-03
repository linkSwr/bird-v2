/**
 * @file: index.js
 *
 * @author: ccx
 *
 * @date: 2016-06-29 15:53:30
 *
 * @description: bird-v2 入口文件
 */

var Express = require('express');
var request = require('request');
var colors = require('colors');
var middleTasksManager;



/**
 * start bird with config
 *
 * @param  {Object} config bird-configuration
 *
 * @return {undefined}
 */
module.exports = function start(config) {
    var jar = request.jar();  // jar to store cookies

    // 兼容处理 ES6 assign
    Object.assign = copyObj();
    // allow multiple bird instances
    if (config && Array.isArray(config)) {
        for (var i = 0; i < config.length; i++) {
            start(config[i]);
        }
        return;
    }

    config = configResolver(config, jar);

    // check if config ok
    if (!config.ifOk) {
        console.info('check your configuration, pls');
        return;
    }
    // silence when not debugging
    if (!config.debug) {
        global.console.log = function (){};
    }

    if (config.middleware) {
        if (config.ifAuth) {
            config.auth(config, jar);
            // auth(config, jar); ?
        }
        // http://stackoverflow.com/questions/20274483/how-do-i-combine-connect-middleware-into-one-middleware
        return listAll([
            require('./lib/mock')(config),
            require('./lib/change-user')(config),
            require('./lib/proxy')(config)
        ]);
    }

    // 普通运行流程
    if (config.ifAuth) {
        config.auth(config, jar).then(function () {
            // setup bird app
            var app = new Express();
            // 初始化task manager
            middleTasksManager = require('./lib/middleTasksManager')(config);
            app.all('*', require('./lib/lib')(config, middleTasksManager, true));

            // app.all('*', require('./lib/mock')(config));
            // app.all('*', require('./lib/static')(config));
            // app.all('*', require('./lib/change-user')(config));
            // if (config.ifProxy) {
            //     app.all('*', require('./lib/proxy')(config));
            // }
            // go!
            app.listen(config.birdPort);
            console.info('BIRD'.rainbow, '============', config.name || '', 'RUNNING at', 'http://localhost:' + config.birdPort, '===============', 'BIRD'.rainbow);
        });
    }
    else {
        var app = new Express();
        // 初始化task manager
        middleTasksManager = require('./lib/middleTasksManager')(config);
        app.all('*', require('./lib/lib')(config, middleTasksManager, false));

        // app.all('*', require('./lib/mock')(config));
        // app.all('*', require('./lib/static')(config));
        // if (config.ifProxy) {
        //     app.all('*', require('./lib/proxy')(config));
        // }
        app.listen(config.birdPort);
        console.info('BIRD'.rainbow, '============', config.name || '', 'RUNNING at', 'http://localhost:' + config.birdPort, '===============', 'BIRD'.rainbow);
    }
};



/**
 * @method configResolver
 *
 * @param {Object} originConfig 用户配置项
 *
 * @param {Object} jar jar包，存储http相关状态信息
 *
 * @return {Object} 初始化完成的 config
 *
 * @description 根据用户的配置项初始化bird-v2需要使用的config数据
 */

function configResolver(originConfig, jar) {
    if (!originConfig || typeof originConfig !== 'object') {
        return {
            ifOk: false
        };
    }
    var config = Object.assign({}, originConfig);
    // 没有配置本地项目路径
    if (!config.staticFileRootDirPath) {
        config.ifOk = false;
        return config;
    }
    config.ifOk = true;
    // 配置了dev server地址才启动代码功能
    if (config.server) {
        config.ifProxy = true;
    }
    // 如果配置了username 和 passport, 则加载登录验证模块
    if (config.username && (config.hasOwnProperty('password') || config.hasOwnProperty('password_suffix'))) {
        config.ifAuth = true;
        config.auth = require('./auths/' + (originConfig.authType || originConfig.auth_standalone || 'uuap'));
    }
    config.birdPort = originConfig.bird_port || 8888;
    config.jar = jar;
    return config;
}



/**
 * @method listAll
 *
 * @param {Array} list 中间件列表
 *
 * @return {Function} 实际处理的方法
 *
 * @description: 缓存中间件列表并且返回中间件的处理函数
 */
function listAll(list) {
    return function (req, res, next) {
        (function iter(i) {
            var mid = list[i];
            if (!mid) {
                return next();
            }
            mid(req, res, function (err) {
                if (err) {
                    return next(err);
                }
                iter(i + 1);
            });
        }(0));
    };
}



/**
 * @method copyObj
 *
 * @param {Object} target 目标对象
 *
 * @param {Object} source 源对象
 *
 * @return {Function} assign ES6 的Object.assign方法的兼容处理
 *
 * @example:
 *
 *      copyObj()
 */
function copyObj(target, source) {
    function assign(target, source) {
        for (var i in source) {
            target[i] = source[i];
            if (typeof source[i] === 'object') {
                assign(target[i], source[i]);
            }
        }
        return target;
    }

    if (Object.assign && typeof Object.assign === 'function' && !Object.assign.toString().match('copyObj')) {
        return Object.assign;
    }
    return assign;
}
