/**
 * @file: lib.js
 *
 * @author: ccx
 *
 * @date: 2016-06-30 22:13:02
 *
 * @description: http 请求的bird标准处理流程都是用此js作为入口
 *
 * 并且此入口文件负责执行 middletasks
 */
var Promise = require('bluebird');
var fs = require('fs');
var taskList;
var middleTasksManager;
var config;
var mock;
var static;
var changeUser;
var proxy;
var lasResponseAction;
var useAuth;

/**
 * @method entry
 *
 * @param {Object} req http请求对象
 *
 * @param {Object} res http响应对象
 *
 * @param {Function} next callback函数
 *
 * @description: 在bird基本流程中加载middletasks
 */

function entry(req, res, next) {
    requsetTasks(req, res).then(function () {
        return standardTasks(req, res);
    }).finally(function () {
        responseTasks(req, res, next);
    });
    // 读取middletasks列表
}

/**
 * @method responseTasks
 *
 * @param {Object} req http请求对象
 *
 * @param {Object} res http响应对象
 *
 * @param {Function} next callback函数
 *
 * @description: 执行注册的request阶段流程; 非标准流程，可以外部注册
 */
function requsetTasks(req, res, next) {
    var _end = res.end;
    var _send = res.send;
    var _json = res.json;
    var _reject;

    // 还原res.end, res.send, res.json
    function resetRes() {
        res.end = _end;
        res.send = _send;
        res.json = _json;
    }

    function setResFunction(name) {
        return function () {
            eval('_' + name).apply(res, arguments);
            _reject();
        };
    }

    // 执行外部注册的
    return new Promise(function (resolve, reject) {
        _reject = reject;
        // 阻止连接被关闭
        res.end = setResFunction('end');
        res.send = setResFunction('send');
        res.json = setResFunction('json');
        middleTasksManager.execute('request', req, res, resolve, reject);
    }).then(resetRes).catch(resetRes);
}




/**
 * @method standardTasks
 *
 * @param {Object} req http请求对象
 *
 * @param {Object} res http响应对象
 *
 * @param {Function} next callback函数
 *
 * @description: 执行标准的bird处理流程，此阶段流程不能在外部注册
 */
function standardTasks(req, res) {
    var _end = res.end;
    var _send = res.send;
    var _json = res.json;
    var _reject;

    // 还原res.end, res.send, res.json
    function resetRes() {
        res.end = _end;
        res.send = _send;
        res.json = _json;
    }

    function setResFunction(name) {
        // eval('_' + arguments.callee.name).apply(res, arguments);
        // 存储标准流程最后的response关闭方式, responseTasks只能修改response数据不能修改最后的response关闭方式
        return function () {
            lasResponseAction = {
                name: name,
                args: arguments
            };
            _reject();
        };
    }

    return new Promise(function (resolve, reject) {
        _reject = reject;
        res.end = setResFunction('end');
        res.send = setResFunction('send');
        res.json = setResFunction('json');
        mock(req, res, resolve, reject);
    }).then(function () {
        return new Promise(function (resolve, reject) {
            _reject = reject;
            static(req, res, resolve, reject);
        });
    }).then(function () {
        if (useAuth) {
            return new Promise(function (resolve, reject) {
                _reject = reject;
                changeUser(req, res, resolve, reject);
            });
        }
    }).then(function () {
        if (config.ifProxy) {
            return new Promise(function (resolve, reject) {
                _reject = reject;
                proxy(req, res, resolve, reject);
            });
        }
    }).then(resetRes).catch(resetRes);
}



/**
 * @method responseTasks
 *
 * @param {Object} req http请求对象
 *
 * @param {Object} res http响应对象
 *
 * @param {Function} next callback函数
 *
 * @description: 执行注册的response阶段流程; 非标准流程，可以外部注册
 */
function responseTasks(req, res, next) {
    var _end = res.end;
    var _send = res.send;
    var _json = res.json;
    // var IS_REJECT = false;

    // 执行外部注册的
    return new Promise(function (resolve, reject) {
        // 阻止连接被关闭
        res.end = res.send = res.json = function () {
            // eval('_' + arguments.callee.name).apply(res, arguments);
            // IS_REJECT = true;
            resolve();
        };
        middleTasksManager.execute('response', req, res, resolve, reject);
    }).catch(function (error) {
        console.info('reject', arguments);
    }).finally(function () {
        res.end = _end;
        res.send = _send;
        res.json = _json;
        // 执行标准流程存储的response操作
        console.info('lasResponseAction', lasResponseAction);
        lasResponseAction &&
        res[lasResponseAction.name].apply(res, lasResponseAction.args);
        next();
    });
}

/**
 * @method formatTaskName
 *
 * @param {string} _name 任务名称
 *
 * @return {string} 返回格式化后的task名称
 *
 * @description: 格式化任务名称，'plant form' -> 'plantForm'
 */
function formatTaskName(_name) {
    var name = _name.split(' ');
    name.forEach(function (el, index, array) {
        if (index !== 0) {
            array[index] = el.replace(/^\S/g, el[0].toUpperCase());
        }
    });
    return name.join('');
}

/**
 * @method formatDepsName
 *
 * @param {Array} deps 依赖任务列表
 *
 * @return {Array} 返回格式化后的dep数组
 *
 * @description: 格式化任务名称，'plant form' -> 'plantForm'
 */
function formatDepsName(deps) {
    deps.forEach(function (el, index, array) {
        array[index] = formatTaskName(el);
    });
    return deps;
}


module.exports = function (_config, _middleTasksManager, _useAuth) {
    var task;
    var taskType = ['request', 'response'];
    var fileName;
    config = _config;
    middleTasksManager = _middleTasksManager;
    useAuth = _useAuth;

    // 加载标准处理流程的处理模块
    mock = require('./mock')(config);
    static = require('./static')(config);
    changeUser = require('./change-user')(config);
    proxy = require('./proxy')(config);

    // 读取task文件列表
    taskList = fs.readdirSync(__dirname + '/middletasks');
    taskList.forEach(function (el, index, array) {
        fileName = el.replace(/(.*)\.js$/, '$1');
        task = require('./middletasks/' + fileName);
        if (typeof task === 'function') {
            task = task(config)
            // console.info('fileName', fileName)
            // 注册middletask
            try {
                fileName = formatTaskName(fileName);
                task.deps = formatDepsName(task.deps || []);
                middleTasksManager[
                    'register' +
                    task.type.replace(/^(.)/g, task.type[0].toUpperCase()) +
                    'Tasks'
                ](fileName, task.deps, task.processer);
            }
            catch(e) {
                if (!~taskType.indexOf(task.type)) {
                    console.error(new Error(el, 'task type only can be set "request" or "response"'));
                }
                else {
                    throw e;
                }
            }
        }
    });
    console.info('middleTasksManager tasks: ', middleTasksManager.tasks);
    return entry;
};
