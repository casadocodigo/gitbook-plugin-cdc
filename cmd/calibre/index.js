var exec = require('child_process').exec;

var Q = require('q');

function _calibreOptions(options) {
  var calibreOptions = '';
  var option;
  for (option in options) {
    if (options.hasOwnProperty(option)) {
      var value = options[option];
      if (value) {
        if (typeof value === 'boolean') {
          calibreOptions += option + ' ';
        } else {
          calibreOptions += option + '="' + options[option] + '" ';
        }
      }
    }
  }
  return calibreOptions;
}

function generate(inputFilename, outputFilename, options) {
  var d = Q.defer();

  console.log('calibre - Preparing to call calibre...');

  return Q().then(function () {
    var calibreCall = 'ebook-convert ' + inputFilename + ' ' + outputFilename + ' ' + _calibreOptions(options);

    console.log('calibre - Calling calibre...');
    console.log(calibreCall);

    exec(calibreCall, function (error, stdout, stderr) {
      if (error) {
        console.log('calibre - Error calling calibre. :/');
        return d.reject(error.message + ' ' + stdout);
      }
      console.log('calibre - done! :)');
      return d.resolve();
    });

    return d.promise;
  });
}

module.exports = {
  generate: generate
};