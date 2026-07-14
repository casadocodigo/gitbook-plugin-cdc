var exec = require('child_process').exec;
var Q = require('q');

var MAX_BUFFER = 50 * 1024 * 1024;

function extractText(pdfFile) {
  console.log('pdftotext - Preparing to extract text from pdf...');
  var d = Q.defer();
  return Q().then(function () {
    var pdfToTextCall = 'pdftotext "' + pdfFile + '" -';
    console.log('pdftotext - Calling pdftotext...');
    console.log(pdfToTextCall);
    exec(pdfToTextCall, {
      maxBuffer: MAX_BUFFER
    }, function (error, stdout, stderr) {
      if (error) {
        console.log('pdftotext - Error while extracting text from pdf. :/');
        return d.reject(error);
      }
      console.log('pdftotext - Extracted text from pdf! :)');
      return d.resolve(stdout);
    });
    return d.promise;
  });
}

function extractTextPositions(pdfFile) {
  console.log('pdftotext - Preparing to extract text positions from pdf...');
  var d = Q.defer();
  return Q().then(function () {
    var pdfToTextCall = 'pdftotext -bbox ' + pdfFile + ' -';
    console.log('pdftotext - Calling pdftotext...');
    console.log(pdfToTextCall);
    exec(pdfToTextCall, {
      maxBuffer: MAX_BUFFER
    }, function (error, stdout, stderr) {
      if (error) {
        console.log('pdftotext - Error while extraction text positions from pdf. :/');
        return d.reject(error);
      }
      console.log('pdftotext - Extracted text positions from pdf! :)');
      var xml = stdout;
      return d.resolve(xml);
    });
    return d.promise;
  });
}

module.exports = {
  extractText: extractText,
  extractTextPositions: extractTextPositions
};
