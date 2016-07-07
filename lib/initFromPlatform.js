/**
 * @file: initFromPlatform.js
 *
 * @author: swr
 *
 * @date: 2016-07-05 16:28:53
 *
 * @description: 从bird平台拉取初始化的配置信息
 */
var http = require('http');
var url = require('url');
var Promise = require('bluebird');
var process = require('process');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
var checkUrl;
var config;
var initInfo;
var currVersion;

/**
 * @method getPlatformInfo
 *
 * @param {Function} reslove Promise的reslove
 *
 * @param {Function} reject Promise的reject
 *
 * @description: 从指定server获取bird的配置信息，属于增强功能
 */
function getPlatformInfo(reslove, reject) {
    var projectFilePath = path.normalize(__dirname + '/../projectId.json');
    var projectId;

    var options = {
        host: checkUrl.hostname,
        port: checkUrl.port,
        path: checkUrl.path,
        method: 'POST',
        headers: {}
    };

    try {
        projectId = fs.readFileSync(projectFilePath, 'utf8');
    }
    catch(e) {
        projectId = '';
    }

    http.get(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (data) {
            if (~res.headers['content-type'].indexOf('application/json')) {
                data = JSON.parse(data);
                updateBird(data.birdClientVersion, projectId).then(function (_data) {
                    return setProjectId(data.projectIds, projectId).then(function (_data) {
                        _data && fs.writeFileSync(projectFilePath, _data, 'utf8');
                        config.projectId = _data;
                        // reslove(data);
                    }).finally(function () {
                        reslove(data);
                    });
                }).catch(function (_data) {
                    return setProjectId(data.projectIds, projectId).then(function (_data) {
                        _data && fs.writeFileSync(projectFilePath, _data, 'utf8');
                        config.projectId = _data;
                        // reslove(data);
                    }).finally(function () {
                        reject(data);
                    });
                });
            }
        });
    }).on('error', function (e) {
        console.info('Got error: ', e.message);
    });
}

/**
 * @method modifyConfig
 *
 * @param {Object} data  用于更新的数据
 *
 * @return {Function}
 *
 * @description: 使用platform
 */
function modifyConfig(data) {
    var index;
    return function (reslove, reject) {
        if (~(index = data.projectIds.indexOf(config.name))) {
            config.projectId = data.projectIds[index];
        }
    };
}

/**
 * @method updateBird
 *
 * @param {string} version 版本号
 *
 * @return {Object}
 *
 * @description: 检查更新信息，如果server指定版本高于当前版本的话，执行本地更新的shell
 */
function updateBird(version, projectId) {
    var package;
    // 获取当前进程的ID
    // 启动子进程
    // 使用子进程问用户是否升级
    // 如果否的话就直接运行bird
    // 如果用户选择升级的话就终止主进程
    // 并且在子进程中执行升级
    // 升级完成之后在主进程启动bird

    return new Promise(function (reslove, reject) {
        var nodeModulesPath = path.normalize(__dirname + '/../../');
        var isUseNpm = /BEFE\/{0,1}$/.test(nodeModulesPath);
        var packageJsonPath = path.normalize(__dirname + '/../package.json');
        var updateScriptPath = path.normalize(__dirname + '/../../node_modules/birdv2/updateScript.js');
        var hasUpdateScript;
        var child;
        if (!currVersion) {
            package = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            currVersion = package.version.match(/([\d\.]*)/g).join('');
        }

        try {
            hasUpdateScript = !!fs.statSync(updateScriptPath);
        }
        catch (e) {
            hasUpdateScript = false;
        }

        if (isUseNpm && currVersion !== version && hasUpdateScript) {
            // 询问是否升级
            process.stdout.write('当前birdv2版本: ' +
                currVersion + '; platForm建议升级到' +
                version + ';\r\n是否进行升级(YES/NO)? ');
            new Promise(getTerminalInput).then(function (data) {
                data = data.match('^[A-Za-z]+').join(' ');
                // console.info('nodeModulesPath', __dirname);
                if (data.toLowerCase() === 'yes') {
                    // reslove(data);
                    // 打开子线程
                    // 读取当前项目的版本ID信息
                    // 如果是就执行npm 的update命令
                    // 否则执行reject
                    // node ./node_modules/birdv2/updateScript.js
                    // console.info('nodeModulesPath', process.pid)
                    child = spawn('node', [updateScriptPath, version, process.pid, projectId],
                        {
                            cwd: nodeModulesPath
                        }
                    );
                    child.stdout.on('data', function (data) {
                        process.stdout.write(data.toString('utf8'));
                    });

                    child.stderr.on('data', function (data) {
                        process.stdout.write(data.toString('utf8'));
                    });

                    child.on('exit', function (code) {
                        // console.info(stdout);
                        if (code) {
                            console.info('exec code: ' + code);
                            reject(data);
                        }
                        else {
                            console.info('exec code: ' + code);
                            console.info('birdv2 已经更新，当前版本为: ' + version);
                            reslove(data);
                        }
                    });
                    // child = exec('node ' + updateScriptPath + ' ' + version + ' ' + process.pid + ' ' + projectId,
                    //     function (error, stdout, stderr) {
                    //         console.info(stdout);
                    //         if (error !== null) {
                    //             console.info('exec error: ' + error);
                    //             reject(data);
                    //         }
                    //         else {
                    //             console.info('birdv2 已经更新，当前版本为: ' + version);
                    //             reslove(data);
                    //         }
                    //         // child.kill();
                    //     }
                    // );
                }
                else {
                    reject(data);
                }
            });
        }
        else {
            reject();
        }
    });
}

/**
 * @method getTerminalInput
 *
 * @param {Function} reslove Promise的reslove
 *
 * @param {Function} reject Promise的reject
 *
 * @description: 获取终端输入信息
 */
function getTerminalInput(reslove, reject) {
    var result = '';
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', function (chunk) {
        result += chunk;
        process.stdin.pause();
        reslove(result);
    });
}

/**
 * @method setProjectId
 *
 * @param {Array} ids id列表
 *
 * @return {Object}
 *
 * @example: 让用户选择当前项目id
 */
function setProjectId(ids, projectId, tryAgain) {
    var result;
    return new Promise(function (reslove, reject) {
        if (projectId) {
            reslove(projectId);
            return;
        }
        if (!tryAgain) {
            console.info('platForm维护的项目有:');
            ids.forEach(function (el, index, array) {
                process.stdout.write('(' + index + ')' + el + '    ');
            });
            process.stdout.write('\n\r请填写你当前使用的项目Id前的数字(没有相关项目的话填 -1 ): ');
        }
        else {
            process.stdout.write('\n\r请重新填写(没有相关项目的话填 -1 ): ');
        }
        new Promise(getTerminalInput).then(function (data) {
            data = (data.match(/[\-0-9]+/) || []).join(' ');
            if (data !== '-1') {
                result = ids[parseInt(data)] || 0;
                if (result) {
                    reslove(result);
                }
                else {
                    setProjectId(ids, projectId, true).then(function (data) {
                        reslove(data);
                    });
                }
            }
            else {
                reject();
            }
        });
    }).catch(function (err) {});
}

module.exports = function (_config) {
    config = _config;
    if (config.initCheckUrl) {
        checkUrl = url.parse(config.initCheckUrl || '');
        return new Promise(getPlatformInfo).then(function (data) {
            modifyConfig(data);
        }).then(function () {
            return config;
        });
    }
    return Promise.resolve(config);
};
