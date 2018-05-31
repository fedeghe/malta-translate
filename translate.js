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

	this.fCachePath = './.malta-translate-cache-' +this.lng.from + '-' + this.lng.to + '.json';
	fs.openSync(this.fCachePath, 'a+');
	this.fcache = JSON.parse(fs.readFileSync(this.fCachePath, 'utf-8') || '{}');
}

function lowfirst(str){
	return str.charAt(0).toLowerCase() + str.slice(1);
}

Translator.prototype.translate = function () {
	var self = this;

	// Just collect 
	// i18n data in bucket
	//   key : i18n[toBeTrans]
	// value : toBeTrans
	// 
	// this.txt = this.txt.replace(/i18n\[([^\\\]]*)\]/g, function (str, $1) {
	this.txt = this.txt.replace(/i18n\[([^\\\]\|]*)(\|([^\\\]\|]*))?\]/g, function (str, $1, $2, $3) {
		if (!(str in self.bucket)) {
			self.bucket[str] = {
				text : $1,
				to : $3
			};
			self.bucketSize++;
		}
		return self.neutral ? $1 : str;
	});

	if (self.bucketSize == 0) self.neutral = true;

	return new malta.Promise(self.neutral ?
		function (done) {done(self.txt,{
			cached : 0,
			missing : 0
		});}
		:
		self.digAndTranslate.bind(self)
	).catch(function (e) {
		console.log("\nMalta-translate"  + ' ERROR: '.red());
		console.log(e);
	});
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

		var txt = self.bucket[keys[j]].text,
			lowerCase = txt.match(/^[a-z]/),
			cb = function (trans) {
				
				self.bucket[keys[j]].text = trans;

				(j === bsize-1) ?
					(function () {
						var i;
						for (i in self.bucket)
							while (self.txt.indexOf(i) >= 0)
								self.txt = self.txt.replace(i, self.bucket[i].text);

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
				to: self.bucket[keys[j]].to || self.lng.to
			}).then(function (res){
				self.fcache[txt] = lowerCase ? lowfirst(res.text) : res.text;
				cb(self.fcache[txt]);
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