/**
 * load dependencies and whatever needed
 */
const trans = require('./translate.js'),
    path = require('path'),
    fs = require('fs');

function translate(obj, options) {
    var self = this,
        start = new Date(),
        msg,
        pluginName = path.basename(path.dirname(__filename));

    options = options || {input : 'it', output : 'en'};

    /**
     * the next plugin will be invoked with an updated obj
     * only when the solve function is called passing the updated obj
     */
    return (solve, reject) => {

        trans.translate(obj.content, options).then(({content, stats}) => {
            obj.content = content;
            /**
	         * free to be async
	         */
	        fs.writeFile(obj.name, obj.content, err => {
	            if (err == null) {
	                msg = 'plugin ' + pluginName.white() + ' wrote ' + obj.name +' (' + self.getSize(obj.name) + ')'
	                	+ "\ntranslation stats: " + stats.cached + " cached; " + stats.missing + " missing";
	            } else {
	                console.log('[ERROR] '.red() + pluginName + ' says:');
	                console.dir(err);

	                /**
	                 * something wrong, stop malta
	                 */
	                self.stop();
                }
                err
                    ? reject(`Plugin ${pluginName} write error:\n${err}`)
                    : solve(obj);
	            
	            self.notifyAndUnlock(start, msg);
	        });
        });
    }
}
/**
 * if the plugin shall be used only on some special file types
 * declare it (it can be an array too)  
 * if not specified the plugin will be called on any file
 */
translate.ext = '*';
module.exports = translate;