var path = require("path");

function obtainExtension(options) {
	var extension = options.extension || path.extname(options.output).replace(".", "");
	if (!extension && options.format === "ebook") {
		extension = "pdf";
	}
	return extension;
}

module.exports = {
    "obtainExtension" : obtainExtension
}
