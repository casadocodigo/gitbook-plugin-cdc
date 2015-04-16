var fs = require("fs");
var path = require("path");

var style = {
	"pdf": "pdf.css",
	"epub": "reader.css",
	"mobi": "reader.css"
};

module.exports = {
	ebook : function () {
		var extension = obtainExtension(this.options);
		return {
			assets: "./ebook",
			css: [
				"ebook.css",
				style[extension],
				"hljs.css"
			]
		};
	},
	book : {
		assets: "./book",
		css: [
			"book.css",
			"hljs.css"
		]
	},
	templates: {
		"ebook:sumary": "./ebook/templates/gitbook/summary.html",
		"site:page": "./book/templates/gitbook/page.html",
		"site:langs": "./book/templates/gitbook/langs.html",
		"site:glossary": "./book/templates/gitbook/glossary.html"
	},
	
	obtainExtension: obtainExtension
};

function obtainExtension(options) {
	var extension = options.extension || path.extname(options.output).replace(".", "");
	if (!extension && options.format === "ebook") {
		extension = "pdf";
	}
	return extension;
}
