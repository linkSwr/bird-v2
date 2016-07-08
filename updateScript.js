/**
 * @file: updateScript.js
 *
 * @author: swr
 *
 * @date: 2016-07-07 12:25:39
 *
 * @description: birdv2更新脚本
 */
var fs = require('fs');
var args = process.argv;
var version = args[2] || ''; 
var projectId = args[4] || '';
var pId = args[3];
var path = require('path');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var updateHandle;
var nodeModulesPath = path.normalize(__dirname + '/../../');
var t;

exec('npm install birdv2@' + version + ' --registry=https://registry.npm.taobao.org', {
    cwd: nodeModulesPath
}, function (error, stdout, stderr) {
    if (error !== null) {
        console.info('exec error: ' + error);
    }
    else {
        fs.open(__dirname + '/projectId.json', 'w+', function (err, fd) {
            fs.writeSync(fd, projectId, null, 'utf8');
        });
    }
    clearInterval(t);
    console.info('=>');
    console.info(stdout);
});

t = setInterval(function () {
    process.stdout.write('=');
}, 300);
