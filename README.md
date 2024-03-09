---
[![npm version](https://badge.fury.io/js/malta-translate.svg)](http://badge.fury.io/js/malta-translate)
[![npm downloads](https://img.shields.io/npm/dt/malta-translate.svg)](https://npmjs.org/package/malta-translate)
[![npm downloads](https://img.shields.io/npm/dm/malta-translate.svg)](https://npmjs.org/package/malta-translate)  
---  

This plugin can be used on: all files

Options :  
    - input : default 'it' ... yes Italian! but You can specify any language supported by [@vitalets/google-translate-api][0]  ([here is the list][langs])
    - output : default 'en' but You can specify any language supported by [@vitalets/google-translate-api][0] ([here is the list][langs])


Sample usage:  

suppose the outfile contains a label that should be translated:  

hello.js:  
``` js  
var hello = "hello world", 
    presentations = "myname is Federico";
```

this is a _.js_ file but could be anything, now if we want to translate it in _german_ for example, we rewrite it like:

``` js 
var hello = "i18n[hello world]", 
    presentations = "i18n[my name is] Federico";
```

now we can run malta on it using the malta-translate:  

``` 
> malta app/hello.js public -plugins=malta-js-uglify...malta-translate[input:\"\'en\",output:\"de\"]
```
or in the `.json` file :  

``` sh
"app/hello.js" : "public -plugins=malta-js-uglify...malta-translate[input:\"\'en\",output:\"de\"]"
```

and get :  

`public/hello.js`  

``` js
var hello="Hallo Welt",  
    presentations="Ich heisse Federico";
```

### if  
...within a file that must be translated for example from `en` to `de` one particular word has always to be translated to japanese, regardless the input & output given parameters then is enough to mark it as:  
`i18n[always japanese|ja]`  

### Cache  

The first thing the plugin checks before actually submitting any transation request (for example from `it` to `en`), is the presence of a `.malta-translate-cache-it-en.json` file in the folder where malta is started, in case the file is present it might contain already obtained translations for the needed sentences. In cast the file is not found it will be created and in case is found but the translation si not, then will be added. This allows to minimize the requests.


### Limits & no limits
All translations in the end come from goo9l€, and it does not like bursts of incoming requests from the same IP. So in case translations do not flow out correctly then do what you can to change your IP.


[0]: https://www.npmjs.com/package/@vitalets/google-translate-api
[langs]: https://github.com/fedeghe/malta-translate/blob/master/langs.json

### Backward compatibility
Malta-translate versions < `1.1` need malta < `4.1`