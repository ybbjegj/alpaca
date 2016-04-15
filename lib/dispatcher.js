var ParseJS = require('./parseJS.js');
var ParseCSS = require('./parseCss.js');
var ParseHtml = require('./parseHtml.js');
var Base = require('./base.js');
var util = require('util');
var File = require('./file.js');
var _ = alp._;
var storage = alp.storage;

var common = require('./common.js');

function Dispatcher() {

    if (Dispatcher.instance instanceof Dispatcher) {
        return Dispatcher.instance;
    }
    Base.call(this);
    this.parseJS = new ParseJS();
    this.parseCss = new ParseCSS();
    this.parseHtml = new ParseHtml();
    this.parseHtml.on('parse', (function (file) {
        this.parse(file);
    }).bind(this));

    Dispatcher.instance = this;

}
util.inherits(Dispatcher, Base);

var prototype = {
    addContentProcessor: function (fn) {
        this.parseCss.addContentProcessor(fn);
        this.parseJS.addContentProcessor(fn);
        this.parseHtml.addContentProcessor(fn);
        typeof fn === 'function' && (this.cntProcessor = fn);

    },

    dispatch: function (file) {
        if (file.isLikeJs) {
            this.parseJS.parse(file);
        } else if (file.isLikeCss) {
            this.parseCss.parse(file);
        } else if (file.isLikeHtml) {
            this.parseHtml.parse(file);
        }
    },
    _compile: function (src, dir) {
        var file = src instanceof File ? src : new File(src, dir),
            cacheFile;

        cacheFile = storage[file.subpath];
        file.setContent(this.getFileContent(file));
        if (!file.isLikeHtml) {
            if (common.equalFile(file, cacheFile)) {
                return false;
            }
        }
        storage[file.subpath] = file;

        if (!file.useCompile) {
            return false;
        }

        try {
            this.dispatch(file);
        } catch (e) {
            storage[file.subpath] = cacheFile;
            alp.log.error(e.message);
        }
        if (!file.isLikeHtml) {
            for (var i = 0, len = file.requires.length; i < len; i++) {
                this._compile(file.requires[i], dir);
            }
        }
        return file;
    },
    parse: function (src) {
        var result = this._compile(src),
            file;

        if (result) {
            for (var k in storage) {

                file = storage[k];
                if (!file._hasAdeps) {

                    file.aRequires = common.getADeps(k);
                    file._hasAdeps = true;
                }

            }
        }

        return storage;
    }
};

for (var i in prototype) {

    Dispatcher.prototype[i] = prototype[i];

}

module.exports = function (opt) {
    var dispatcher = new Dispatcher();

    dispatcher.addContentProcessor(opt.contentProcessor);

    return dispatcher.parse(opt.src);
};
