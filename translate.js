var fs = require('fs'),
	translate = require('google-translate-api'),
	malta = require('malta'),
	defaultLng = {
		input : 'it',
		output : 'en'
	},
	oReduce = function(o, fn) {
		'use strict';
		var ret = '',
			j;
		for (j in o) {
			if (o.hasOwnProperty(j)) {
				ret += fn(o, j, ret);
			}
		}
		return ret;
	},
	obj2qs = function (obj) {
		return oReduce(obj, function(o, i, r) {
			return ((r ? '&' : '?') + encodeURIComponent(i) + '=' + encodeURIComponent(o[i])).replace(/\'/g, '%27');
		});
	};

function Translator (txt, lng) {
	this.lng = {
		from : lng.input || defaultLng.input,
		to : lng.output || defaultLng.output
	};
	this.neutral = this.lng.from === this.lng.to;
	this.txt = txt;
	this.bucket = {};
	this.bucketSize = 0;
	this.baseQs = obj2qs({
		client : 'gtx',
		dt : 't',
		sl : this.lng.from,
		tl : this.lng.to
	});

	this.fCachePath = './.malta-translate-cache-' +this.lng.from + '-' + this.lng.to + '.json';
	fs.openSync(this.fCachePath, 'a+');
	this.fcache = JSON.parse(fs.readFileSync(this.fCachePath, 'utf-8') || '{}');
}

Translator.prototype.translate = function () {
	var self = this;

	// Just collect 
	// i18n data in bucket
	//   key : i18n[toBeTrans]
	// value : toBeTrans
	// 
	this.txt = this.txt.replace(/i18n\[([^\\\]]*)\]/g, function (str, $1) {
		if (!(str in self.bucket)) {
			self.bucket[str] = $1;
			self.bucketSize++;
		}
		return this.neutral ? $1 : str;
	});

	return new malta.Promise(self.neutral ?
		function (done) {done(self.txt);}
		:
		self.digAndTranslate.bind(self)
	);
};

Translator.prototype.digAndTranslate = function (done, reject) {
	var self = this,
		i = 0,
		bsize = this.bucketSize,
		keys = Object.keys(self.bucket),
		cacheStats = {
			cached : 0,
			missing : 0
		};
	(function next(j) {

		var txt = self.bucket[keys[j]],
			cb = function (trans) {
				
				self.bucket[keys[j]] = trans;

				(j === bsize-1) ?
					(function () {
						var i;
						for (i in self.bucket)
							while (self.txt.indexOf(i) >= 0)
								self.txt = self.txt.replace(i, self.bucket[i]);

						fs.writeFileSync(self.fCachePath, JSON.stringify(self.fcache), 'utf8');

						done(self.txt, cacheStats);
					})()
					:
					next (j + 1);
			};
			
		if (txt in self.fcache) {
			cacheStats.cached++;
			cb(self.fcache[txt]);
		} else {
			cacheStats.missing++;
			translate(txt, {
				from: self.lng.from,
				to: self.lng.to
			}).then(function (res){
				self.fcache[txt] = res.text;
				cb(res.text);
			}).catch(err => {
				reject(err);
			});	
		}
	})(i);	
};

module.exports = {
	translate : function (txt, lang) {
		return (new Translator(txt, lang)).translate();
	}
};