var path = require("path");

function obtainExtension(options) {
	var extension = options.extension || path.extname(options.output).replace(".", "");
	if (!extension && options.format === "ebook") {
		extension = "pdf";
	}
	return extension;
}

function outputPath(options) {
	var output = options.output;
	if (output.indexOf("/") != 0) {
		var currentPath = path.resolve(".");
		return path.join(currentPath, output);
	}
	return output;
}

var WIDTH_REGEX = /\{w=(\d+)%?\}$/;
var DESKTOP_WIDTH = 1000;
function adjustImageWidth(img, extension){
	if(!img.length){
		return;
	}
	//ajusta width da imagem
	var text = img.attr("alt").trim();
	var regexMatch = text.match(WIDTH_REGEX);
	if (regexMatch && regexMatch[1]) {
		text = text.replace(WIDTH_REGEX, "");
		var width = regexMatch[1];
		if(extension == "pdf") {
			img.css("width", width + "%");
		} else {
			var maxWidth = parseInt(width)/100 * DESKTOP_WIDTH;
			img.css("max-width", maxWidth + "px");
		}
		img.attr("alt", text);
	}
}

module.exports = {
	"obtainExtension" : obtainExtension,
	"outputPath": outputPath,
	"adjustImageWidth": adjustImageWidth
}


