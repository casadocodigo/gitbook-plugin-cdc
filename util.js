var path = require("path");

var PDF_OPTIONS = {
    "--pdf-page-numbers": null,
    "--disable-font-rescaling": true,
    "--paper-size": null,
    "--custom-size": "155x230",
    "--unit": "millimeter",
    "--pdf-default-font-size": "11",
    "--pdf-mono-font-size": "11",
    "--margin-left": "62",
    "--margin-right": "62",
    "--margin-top": "62",
    "--margin-bottom": "62"
};

function obtainExtension(options) {
	var extension = options.extension || path.extname(options.output).replace(".", "");
	if (!extension && options.format === "ebook") {
		extension = "pdf";
	}
	return extension;
}

module.exports = {
    "obtainExtension" : obtainExtension,
    "pdfOptions": PDF_OPTIONS
}
