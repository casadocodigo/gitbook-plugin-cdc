var exec = require('child_process').exec;
var Q = require('q');

function extractTextPositions(pdfFile) {
  console.log('pdftotext - Preparing to extract text positions from pdf...');
  var d = Q.defer();
  return Q().then(function () {
    var pdfToTextCall = 'pdftotext -bbox ' + pdfFile + ' -';
    console.log('pdftotext - Calling pdftotext...')
    console.log(pdfToTextCall);
    exec(pdfToTextCall, function (error, stdout, stderr) {
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
  extractTextPositions: extractTextPositions
};