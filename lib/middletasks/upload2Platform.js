/**
 * @file: upload2PlatForm.js
 *
 * @author: swr
 *
 * @date: 2016-07-04 02:54:24
 *
 * @description: 在response关闭前上报数据到platform
 */

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
function upload2PlantForm (req, res, resolve, reject) {
    resolve();
}



module.exports = function (_config) {
    return {
        type: 'response',
        processer: upload2PlantForm
    };
};
