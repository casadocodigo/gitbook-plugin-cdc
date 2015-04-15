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
			assets: "./book",
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
		"ebook:sumary": "./book/templates/gitbook/summary.html"
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
