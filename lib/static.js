/**
 * @file: static.js
 *
 * @author: ccx
 *
 * @date: 2016-06-30 10:35:03
 *
 * @description: 负责查找本地是否有满足请求的文件
 */

var config;
var url = require('url');
var path = require('path');
var fs = require('fs');
var mime = require('mime-types');
var cheerio = require('cheerio');
var BIRD_USER_SCRIPT = fs.readFileSync(path.join(__dirname, '../devtools/change-user-script.js'), 'utf8');
var BIRD_EXTEND_SCRIPT = fs.readFileSync(path.join(__dirname, '../devtools/bird-extend-script.js'), 'utf8');



/**
 * @method staticHandle
 *
 * @param {Object} req 请求对象
 *
 * @param {Object} res 响应对象
 *
 * @param {Function} next
 *
 * @description: 本地文件查找流程
 */

function staticHandle(req, res, next) {
    var urlParsed = url.parse(req.url);
    var pathName = urlParsed.pathname === '/' ? 'index.html' :  urlParsed.pathname;
    var filePath = path.join(config.staticFileRootDirPath, pathName);
    var o = Object.assign({}, config);

    fs.stat(filePath, function (err, stats) {
        if (err) {
            next();
        }
        else if (stats.isFile() /* file */) {
            // server as static file
            fs.readFile(filePath, function (err, buffer) {
                if (isHtmlPage(buffer)) {
                    // add something nasty in it, that's where bird dev-tool exists
                    var $ = cheerio.load(buffer.toString('utf-8'));
                    $('head').append('<script type="text/javascript">' + BIRD_EXTEND_SCRIPT + '</script>');
                    o.jar = undefined;
                    $('head').append('<script type="text/javascript">window.birdv2.config=' + JSON.stringify(o) + '</script>');
                    if (config.dev_tool) {
                        $('head').append('<script type="text/javascript">' + BIRD_USER_SCRIPT + '</script>');
                        // console.log($.html())
                    }
                    res.setHeader('Content-Type', mime.lookup('.html'));
                    res.write($.html());
                    res.end();
                }
                else {
                    var mimeType = mime.lookup(path.extname(filePath));
                    res.setHeader('Content-Type', mimeType);
                    res.write(buffer);
                    res.end();
                }
            });
        }
        else if (stats.isDirectory() /* directory */) {
            var AUTO_INDEX;
            if (Array.isArray(config.autoIndex)) {
                AUTO_INDEX = config.autoIndex;
            }
            else {
                AUTO_INDEX = config.autoIndex ? config.autoIndex.split(/\x20+/) : ['index.html'];
            }
            if (AUTO_INDEX) {
                var fp;
                for (var i = 0; i < AUTO_INDEX.length; i++) {
                    fp = path.join(filePath, AUTO_INDEX[i]);
                    if (isFile(fp)) {
                        filePath = fp;
                        fs.readFile(filePath, function (err, buffer) {
                            var mimeType = mime.lookup(path.extname(filePath));
                            res.setHeader('Content-Type', mimeType);
                            res.write(buffer);
                            res.end();
                        });
                        break;
                    }
                }
                // if (!isFile(filePath)) {
                //   emptyPage(res, filePath);
                // }
            }
        }
        else {
            // shit happens
            next();
        }
    });
}



/**
 * @method exists
 *
 * @param {string} p 路径
 *
 * @return {bool}
 *
 * @description: 判断文件／目录是否存在
 */
function exists(p) {
    return fs.existsSync(p);
}



/**
 * @method isFile
 *
 * @param {string} p 路径
 *
 * @return {bool}
 *
 * @description: 是否为文件
 */
function isFile(p) {
    return exists(p) && fs.statSync(p).isFile();
}



/**
 * @method isDir
 *
 * @param {string} p 路径
 *
 * @return {bool}
 *
 * @description: 是否为目录
 */
function isDir(p) {
    return exists(p) && fs.statSync(p).isDirectory();
}



/**
 * @method emptyPage
 *
 * @param {string} res 请求对象
 *
 * @param {dtring} fp 文件路径
 *
 * @description: 返回空页面错误
 */
function emptyPage(res, fp) {
    console.info('Local', fp.red, 'not exists'.cyan);
    res.status(404).send('Not found' + (fp ? ' "' + fp + '"' : '') + '!');
    res.end();
}



/**
 * @method isHtmlPage
 *
 * @param {Buffer} buffer 文件的buffer流
 *
 * @return {bool}
 *
 * @description: 判断文件是否为完整html文件，而不只是html模板片段
 */
function isHtmlPage(buffer) {
    var temp = buffer.slice(0, 20);
    var reg = new RegExp('<!DOCTYPE HTML>', 'i');
    return reg.test(temp.toString('utf-8'));
}



module.exports = function (_config) {
    config = _config;
    return staticHandle;
};