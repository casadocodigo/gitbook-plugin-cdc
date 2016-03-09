var fileHelper = require('./../helpers/fileHelper');
var pdf = require('./pdf');

function addPreContent() {
  var extension = fileHelper.obtainExtension(this.options);
  if (extension !== 'pdf') {
    return;
  }
  return pdf.addPreContent.call(this);
}

module.exports = {
  'addPreContent': addPreContent
};
