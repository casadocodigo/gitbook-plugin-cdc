var path = require('path');

function obtainExtension(options) {
  var extension = options.extension || path.extname(options.output).replace('.', '');
  if (!extension && options.format === 'ebook') {
    extension = 'pdf';
  }
  return extension;
}

function outputPath(options) {
  var output = options.output;
  if (output.indexOf('/') != 0) {
    var currentPath = path.resolve('.');
    return path.join(currentPath, output);
  }
  return output;
}

module.exports = {
  'obtainExtension': obtainExtension,
  'outputPath': outputPath
}