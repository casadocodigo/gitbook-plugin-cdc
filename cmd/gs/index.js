var exec = require('child_process').exec;
var fs = require('fs');

var Q = require('q');

function _pageNumberInfo(info) {
  var firstChapterPageNumber = info.preContent.extras.numberOfPages + info.preContent.intro.numberOfPages + info.preContent.toc.numberOfPages + 1;

  var pdfMarks = '';
  pdfMarks += '[ /Title (' + info.book.title + ')\n';
  pdfMarks += '/Author (' + info.book.author + ')\n';
  pdfMarks += '/Creator (' + info.book.publisher + ')\n';
  pdfMarks += '/Producer (' + info.book.publisher + ')\n';
  pdfMarks += '/DOCINFO pdfmark\n';
  pdfMarks += '[/_objdef {pl} /type /dict /OBJ pdfmark\n';
  pdfMarks += '[{pl} <</Nums [ \n';
  pdfMarks += '0 << /S /r >> \n'; //capa e sumário em números romanos
  pdfMarks += firstChapterPageNumber + ' << /S /D /St 1 >> \n';
  pdfMarks += ']>> /PUT pdfmark\n';
  pdfMarks += '[{Catalog} <</PageLabels {pl}>> /PUT pdfmark\n\n';

  info.positions.pages.forEach(function (page, i) {
    page.links.forEach(function (link) {
      pdfMarks += '[\n';
      pdfMarks += '/Rect [ ' + link.xMin.toFixed() + ' ' + link.yMin.toFixed() + ' ' + link.xMax.toFixed() + ' ' + link.yMax.toFixed() + ' ]\n';
      //pdfMarks += '/Border [ 0 0 1 ]\n';
      //pdfMarks += '/Color [ 0 0 1 ]\n';
      pdfMarks += '/Page ' + (firstChapterPageNumber + link.page) + '\n';
      pdfMarks += '/SrcPg ' + (i + 2 + info.preContent.extras.numberOfPages + info.preContent.intro.numberOfPages) + '\n';
      pdfMarks += '/Subtype /Link\n';
      pdfMarks += '/ANN pdfmark\n\n';
    });
  });

  return pdfMarks;
}

function updatePageNumberInfo(inputFile, pageInfo, pageInfoFile, outputFile) {
  console.log('gs - Preparing to update page number info...');
  var d = Q.defer();
  return Q().
    then(function (output) {
      return Q.nfcall(fs.writeFile, pageInfoFile, _pageNumberInfo(pageInfo), {
        encoding: 'ascii'
      });
    }).
    then(function () {
      var pdfSettings = pageInfo.options.pdfImageQuality || 'prepress';
      var gsCall = 'gs -q -dPDFSETTINGS=/' + pdfSettings + ' -o ' + outputFile + ' -sDEVICE=pdfwrite ' + inputFile + ' ' + pageInfoFile;

      console.log('gs - Calling gs...');
      console.log(gsCall);

      exec(gsCall, function (error, stdout, stderr) {
        if (error) {
          console.log('gs - Error while updating page number info. :/');
          return d.reject(error);
        }
        console.log('gs - Updated page number info! :)');
        return d.resolve();
      });
      return d.promise;
    });
}

/*
References:

http://askubuntu.com/questions/32048/renumber-pages-of-a-pdf
http://superuser.com/questions/232553/how-to-change-internal-page-numbers-in-the-meta-data-of-a-pdf
http://www.ghostscript.com/doc/current/Use.htm
*/

module.exports = {
  updatePageNumberInfo: updatePageNumberInfo
};
