module.exports = function (_config) {
    return {
        type: 'request',
        deps: ['mT4'],
        processer: function (req, res, resolve, reject) {
            setTimeout(function() {
            	console.info(1114, 'request from mT3');
            	resolve();
            }, 100);
        }
    };
};
