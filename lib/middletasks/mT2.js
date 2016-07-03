module.exports = function (_config) {
    return {
        type: 'response',
        deps: ['mT1'],
        processer: function (req, res, resolve, reject) {
            console.info(1114, 'response from mT2');
            resolve();
        }
    };
};
