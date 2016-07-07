/**
 * @file: middleTasksManager.js
 *
 * @author: ccx
 *
 * @date: 2016-07-01 00:17:45
 *
 * @description: 负责管理外部注册的处理流程任务
 */
var Promise = require('bluebird');

function MiddleTasksManager() {
    this.tasks = {
        reqTasks: [],
        resTasks: []
    };
}

/**
 * @method registerRequestTasks
 *
 * @param {string} name 注册名
 *
 * @param {Array} _deps 本函数执行的依赖, 顺序不影响deps的执行顺序
 *
 * @param {Function} _func 需要执行的操作
 *
 * @description: 注册request阶段的函数
 */
MiddleTasksManager.prototype.registerRequestTasks = function (name, _deps, _func) {
    this.registerTasks('reqTasks', name, _deps, _func);
};

/**
 * @method registerReponseTasks
 *
 * @param {string} name 注册的task名称
 *
 * @param {Array} _deps 本函数执行前依赖的本阶段其他函数
 *
 * @param {Function} _func 需要执行的操作
 *
 * @description: 注册response阶段的函数
 */
MiddleTasksManager.prototype.registerResponseTasks = function (name, _deps, _func) {
    this.registerTasks('resTasks', name, _deps, _func);
};

/**
 * @method registerTasks
 *
 * @param {string} stage 需要执行的阶段
 *
 * @param {string} name 注册的task名称
 *
 * @param {Array} _deps 本函数执行前依赖的本阶段其他函数
 *
 * @param {Function} _func 需要执行的操作
 *
 * @description: 注册request & response阶段的函数
 */
MiddleTasksManager.prototype.registerTasks = function (stage, name, _deps, _func) {
    var tasks = this.tasks[stage];
    var cpArray = [].concat(tasks);
    var deps = [];
    var func = function () {};

    if (_deps instanceof Array) {
        deps = _deps;
    }
    if (typeof _func === 'function') {
        func = _func;
    }

    // 重新计算任务权重，并重新排序
    if (name && typeof name === 'string') {
        this.tasks[stage] = getSortArray(tasks, {
            name: name,
            task: func,
            deps: deps
        });
    }

};

/**
 * @method execute
 *
 * @param {string} stage stage to run
 *
 * @param {Function} reslove promise resolve
 *
 * @param {Function} reject promise's reject
 *
 * @param {Function} chunk standard workflow data
 *
 * @description: 按照顺序执行指定阶段的所有注册函数
 */
MiddleTasksManager.prototype.execute = function (stage, req, res, reslove, reject, chunk, reqChunk) {
    var cases;
    switch (stage) {
        case 'request':
            cases = this.tasks.reqTasks;
            break;
        case 'response':
            cases = this.tasks.resTasks;
    }
    if (!cases.length) {
        reslove();
    }
    else {
        Promise.reduce(cases, function (total, process, index, length) {
            // task 可能为 undefined
            if (process.task) {
                return new Promise(function (_reslove, _reject) {
                    process.task(req, res, _reslove, _reject, chunk, reqChunk);
                });
            }
        }, 0).then(function (total) {
            reslove();
        }).catch(function (err) {
            reject(err);
        });
    }

};

/**
 * @method findTask
 *
 * @param {string} _name task名称
 *
 * @return {bool}
 *
 * @description: 查找队列中的指定名字的task
 */
function findTask(_name) {
    return function (el, index, array) {
        return el.name === _name;
    };
}

/**
 * @method getSortArray
 *
 * @param {Array} array task队列
 *
 * @param {Object} task 当前计算的task对象
 *
 * @return {Array}
 *
 * @description: 根据新增的task对所有注册的task执行顺序进行重新排序
 */
function getSortArray(array, task) {
    var deps = [];
    var dep;
    task.weight = 0;
    if (task.deps.length) {
        // 计算依赖的权重
        deps = calculateWeight(array, task);
    }
    else {
        deps = array;
    }

    if (dep = deps.find(findTask(task.name))) {
        dep.task = task.task;
        dep.deps = task.deps;
    }
    else {
        deps.push(task);
    }
    // 根据权重倒排序
    deps.sort(function (a, b) {
        return -(a.weight - b.weight);
    });
    return deps;
}

/**
 * @method calculateWeight
 *
 * @param {Array} array task队列
 *
 * @param {Object} task 当前计算的task对象
 *
 * @param {Array} _fronts 已经处理过的task，为了防止循环依赖
 *
 * @return {Array}
 *
 * @description: 递归更新新增task导致的依赖的task的权重变化
 */
function calculateWeight(array, task, _fronts) {
    var dep;
    var fronts = _fronts || [task.name];
    var result = array;

    task.deps.forEach(function (el, index, list) {
        dep = array.find(findTask(el));
        if (dep) {
            dep.weight += 1;
            if (~fronts.indexOf(dep.name)) {
                fronts.push(el);
                result = calculateWeight(result, dep, fronts);
            }
        }
        else {
            array.push({
                name: el,
                weight: 1
            });
        }
    });
    return result;
}

module.exports = function (_config) {
    var manager = new MiddleTasksManager();
    return manager;
};
