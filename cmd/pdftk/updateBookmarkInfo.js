var exec = require('child_process').exec;
var fs = require('fs');

var Q = require('q');

function _bookmarkInfo(info) {
  var pdfInfo = '';

  //somando 1 para considerar a capa
  var pageNumberOffset = info.preContent.extras.numberOfPages + info.preContent.intro.numberOfPages + info.preContent.toc.numberOfPages + 1;

  if (info.toc) {
    info.toc.forEach(function (chapter) {
      pdfInfo += 'BookmarkBegin\n';
      pdfInfo += 'BookmarkTitle: ' + chapter.title + '\n';
      pdfInfo += 'BookmarkLevel: 1\n';
      pdfInfo += 'BookmarkPageNumber: ' + (chapter.pageNumber + pageNumberOffset) + '\n';

      if (chapter.sections) {
        chapter.sections.forEach(function (section) {
          pdfInfo += 'BookmarkBegin\n';
          pdfInfo += 'BookmarkTitle: ' + section.title + '\n';
          pdfInfo += 'BookmarkLevel: 2\n';
          pdfInfo += 'BookmarkPageNumber: ' + (section.pageNumber + pageNumberOffset) + '\n';

          if (section.subSections) {
            section.subSections.forEach(function (subSection) {
              pdfInfo += 'BookmarkBegin\n';
              pdfInfo += 'BookmarkTitle: ' + subSection.title + '\n';
              pdfInfo += 'BookmarkLevel: 3\n';
              pdfInfo += 'BookmarkPageNumber: ' + (subSection.pageNumber + pageNumberOffset) + '\n';
            });
          }
        });
      }
    });
  }

  return pdfInfo;
}

function updateBookmarkInfo(inputFile, info, infoFile, outputFile) {
  console.log('pdftk - Preparing to update bookmark info...');
  var d = Q.defer();
  return Q()
    .then(function (output) {
      return Q.nfcall(fs.writeFile, infoFile, _bookmarkInfo(info));
    }).then(function () {
      var pdftkCall = 'pdftk ' + inputFile + ' update_info ' + infoFile + ' output ' + outputFile;

      console.log('pdftk - Calling pdftk...');
      console.log(pdftkCall);

      exec(pdftkCall, function (error, stdout, stderr) {
        if (error) {
          console.log('pdftk - Error while updating bookmark info. :/');
          return d.reject(error);
        }
        console.log('pdftk - Updated bookmark info! :)');
        return d.resolve();
      });
      return d.promise;
    });
}

module.exports = updateBookmarkInfo;

