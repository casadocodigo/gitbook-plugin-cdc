var exec = require('child_process').exec;

var Q = require('q');

function _generatePdftkJoinCall(pdfFile, files, outputFile) {
  function filesRanges(files, action) {
    var ranges = '';
    var i, letter;
    for (i = 0, letter = 'B'.charCodeAt(0); i < files.length; i++, letter++) {
      ranges += action(letter, i);
    }
    return ranges;
  }

  function onlyLetter(letter, i) {
    return ' ' + String.fromCharCode(letter);
  }

  function letterAndFile(letter, i) {
    return onlyLetter(letter, i) + '="' + files[i] + '"';
  }

  //O toc original, gerado pelo gitbook/calibre, tem sempre apenas uma pagina.
  //isso é garantido pq o conteudo do toc original nao é visivel (display:none).

  var pdftkCall = 'pdftk A="' + pdfFile + '"';
  pdftkCall += filesRanges(files, letterAndFile);
  pdftkCall += ' cat A1';
  pdftkCall += filesRanges(files, onlyLetter);
  pdftkCall += ' A3-end output ' + outputFile;
  return pdftkCall;
}

function join(pdfFile, files, outputFile) {
  console.log('pdftk - Preparing to join pre content to pdf...');
  var d = Q.defer();
  return Q().then(function () {
    var pdftkCall = _generatePdftkJoinCall(pdfFile, files, outputFile);
    console.log('pdftk - Calling pdftk...');
    console.log(pdftkCall);
    exec(pdftkCall, function (error, stdout, stderr) {
      if (error) {
        console.log('pdftk - Error while joining pre content. :/');
        return d.reject(error);
      }
      console.log('pdftk - Joined pre content! :)');
      return d.resolve();
    });
    return d.promise;
  });
}

module.exports = join;
