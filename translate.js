const fs = require('fs'),
	trans = require('@vitalets/google-translate-api'),
	defaultLng = {
		input : 'it',
		output : 'en'
    };

const lowfirst = str => str.charAt(0).toLowerCase() + str.slice(1);

function Translator(content, lng, solve, reject) {
    this.content = content;
    this.solve = solve;
    this.reject = reject;
    this.stats = {
        cached: 0,
        missing: 0
    }

    this.lng = {
		from : lng.input || defaultLng.input,
		to : lng.output || defaultLng.output
	};
	this.neutral = this.lng.from === this.lng.to;
	this.bucket = {};
	this.bucketSize = 0;

	this.fCachePath = './.malta-translate-cache-' +this.lng.from + '-' + this.lng.to + '.json';
	fs.openSync(this.fCachePath, 'a+');
	this.fcache = JSON.parse(fs.readFileSync(this.fCachePath, 'utf-8') || '{}');
}

Translator.prototype.collect = function () {
    const self = this;
    // Just collect 
	// i18n data in bucket
	//   key : i18n[toBeTrans]
	// value : toBeTrans
	// 
	this.content = this.content.replace(/i18n\[([^\\\]\|]*)(\|([^\\\]\|]*))?\]/g, function (str, $1, $2, $3) {
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
    return this;
};

Translator.prototype.translate = function () {
    const self = this,
        bsize = this.bucketSize,
        keys = Object.keys(self.bucket);

    if (this.neutral) {
        this.solve({
            content: this.content,
            stats: this.stats
        });
    }

    let i = 0;
		
	(function next(j) {

		const txt = self.bucket[keys[j]].text,
			lowerCase = txt.match(/^[a-z]/),
			cb = function (trans) {
				
				self.bucket[keys[j]].text = trans;

				(j === bsize-1) ?
					(function () {
						var i;
						for (i in self.bucket) {
							while (self.content.indexOf(i) >= 0) {
                                self.content = self.content.replace(i, self.bucket[i].text);
                            }
                        }

						fs.writeFileSync(self.fCachePath, JSON.stringify(self.fcache), 'utf8');
						self.solve({content: self.content, stats: self.stats});
					})()
					:
					next (j + 1);
			};
		if (txt in self.fcache) {
			self.stats.cached++;
			cb(self.fcache[txt]);
		} else {
			self.stats.missing++;
			trans.translate(txt, {
				from: self.lng.from,
				to: self.bucket[keys[j]].to || self.lng.to
			}).then(function (res){
				self.fcache[txt] = lowerCase ? lowfirst(res.text) : res.text;
				cb(self.fcache[txt]);
			}).catch(err => {
				self.reject(err);
				console.log(err.message);
			});	
		}
	})(i);	

};

module.exports = {
    translate: (content, lng) => 
		new Promise((solve, reject) => {
            new Translator(content, lng, solve, reject).collect().translate()
        })
};