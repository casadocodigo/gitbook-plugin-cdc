var fs = require("fs");
var path = require("path");

var util = require("./../util.js");

var style = {
	"pdf": "pdf.css",
	"epub": "reader.css",
	"mobi": "reader.css"
};

module.exports = {
	ebook : function () {
		var extension = util.obtainExtension(this.options);
		return {
			assets: "./theme/ebook",
			css: [
				"ebook.css",
				style[extension],
				"hljs.css"
			]
		};
	},
	book : {
		assets: "./theme/book",
		css: [
			"book.css",
			"hljs.css"
		]
	},
	templates: {
		"ebook:sumary": "./theme/ebook/templates/gitbook/summary.html",
		"site:page": "./theme/book/templates/gitbook/page.html",
		"site:langs": "./theme/book/templates/gitbook/langs.html",
		"site:glossary": "./theme/book/templates/gitbook/glossary.html"
	}
};
