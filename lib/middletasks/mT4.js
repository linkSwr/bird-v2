module.exports = function (_config) {
    return {
        type: 'request',
        deps: ['m iT3'],
        processer: function (req, res, resolve, reject) {
            setTimeout(function() {
            	console.info(1114, 'request from mT4');
            	resolve();
            }, 100);
        }
    };
};
