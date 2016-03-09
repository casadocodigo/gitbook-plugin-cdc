var path = require('path');
var fs = require("fs");

var Q = require("q");

function obtainExtension(options) {
  var extension = options.extension || path.extname(options.output).replace('.', '');
  if (!extension && options.format === 'ebook') {
    extension = 'pdf';
  }
  return extension;
}

function outputPath(options) {
  var output = options.output;
  if (output.indexOf('/') !== 0) {
    var currentPath = path.resolve('.');
    return path.join(currentPath, output);
  }
  return output;
}

function listFilesByExtension(dir, extension) {
  extension = extension || '.pdf';
  var d = Q.defer();
  return Q().then(function () {
    fs.readdir(dir, function (error, files) {
      if (error) {
        return d.resolve([]);
      }
      var filtered = files.filter(function (file) {
        return path.extname(file) === extension;
      });
      var sortedByName = filtered.sort(function (a, b) {
        return a.localeCompare(b);
      });
      var resolvedFiles = sortedByName.map(function (file) {
        return path.resolve(dir, file);
      });
      return d.resolve(resolvedFiles);
    });
    return d.promise;
  });
}

module.exports = {
  'obtainExtension': obtainExtension,
  'outputPath': outputPath,
  'listFilesByExtension': listFilesByExtension
};
