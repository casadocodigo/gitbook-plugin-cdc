var exec = require('child_process').exec;

var Q = require('q');

function multistamp(stamp, input, output) {

  console.log('pdftk - Preparing to multistamp...')

  var d = Q.defer();

  return Q().then(function () {

    //pdftk in.pdf multistamp stamp.pdf output out.pdf


    var pdftkCall = 'pdftk ' + input + ' multistamp ' + stamp + ' output ' + output;

    console.log('pdftk - Calling pdftk...')
    console.log(pdftkCall);

    exec(pdftkCall, function (error, stdout, stderr) {
      if (error) {
        console.log('pdftk - Error while multistamping. :/');
        return d.reject(error);
      }
      console.log('pdftk - Mutistamp done! :)');
      return d.resolve();
    });

    return d.promise;

  });
}

module.exports = multistamp;
