module.exports = function (_config) {
    return {
        type: 'response',
        deps: [],
        processer: function (req, res, resolve, reject) {
            setTimeout(function() {
            	console.info(1114, 'response from mT1');
            	resolve();
            }, 100);
        }
    };
};
