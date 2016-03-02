var exec = require('child_process').exec;

var Q = require('q');

function extractNumberOfPagesFromFiles(files) {
  if (!files.length) {
    return 0;
  }

  var d = Q.defer();

  return Q().then(function () {

    var promises = [];
    files.forEach(function (file) {
      promises.push(_extractNumberOfPages(file));
    });

    Q.all(promises)
      .spread(function () {
        var sum = [].
        reduce
          .call(arguments, function (a, b) {
            return a + b;
          });
        return d.resolve(sum);
      }, function (error) {
        return d.reject(error);
      });

    return d.promise;

  });
}

function _extractNumberOfPages(pdfFile) {
  console.log('pdftk - Preparing to extract number of pages...')

  var d = Q.defer();

  return Q().then(function () {

    var pdftkCall = 'pdftk "' + pdfFile + '" dump_data';

    console.log('pdftk - Calling pdftk...');
    console.log(pdftkCall);

    exec(pdftkCall, function (error, stdout, stderr) {
      if (error) {
        console.log('pdftk - Error while extracting number of pages. :/');
        return d.reject(error);
      }

      var numberOfPages =
        stdout
        .split('\n')
        .filter(function (line) {
          return line.indexOf('NumberOfPages') == 0;
        })[0].split(':')[1];
      console.log('pdftk - Extracted number of pages! :)');

      return d.resolve(parseInt(numberOfPages));
    });

    return d.promise;

  });
}

module.exports = extractNumberOfPagesFromFiles;
