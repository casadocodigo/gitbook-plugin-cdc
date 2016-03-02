var exec = require('child_process').exec;

var Q = require('q');

function extractTOC(pdfFile) {

  console.log('pdftk - Preparing to extract toc...')

  var d = Q.defer();

  return Q().then(function () {

    var pdftkCall = 'pdftk "' + pdfFile + '" dump_data';

    console.log('pdftk - Calling pdftk...')
    console.log(pdftkCall);

    exec(pdftkCall, function (error, stdout, stderr) {
      if (error) {
        console.log('pdftk - Error while extracting TOC. :/');
        return d.reject(error);
      }

      var toc = _buildTocFromDumpedData(stdout);

      console.log('pdftk - Extracted TOC! :)');
      return d.resolve(toc);
    });

    return d.promise;

  });
}

function _buildTocFromDumpedData(pdftkData) {
  var bookmarkInfo =
    pdftkData
    .split('\n')
    .filter(function (line) {
      return line.indexOf('Bookmark') == 0 &&
        (line.indexOf('Level') > 0 || line.indexOf('Title') > 0 || line.indexOf('PageNumber') > 0);
    });

  var tocInfo = {
    'BookmarkTitle': [],
    'BookmarkLevel': [],
    'BookmarkPageNumber': []
  };
  bookmarkInfo.forEach(function (el) {
    var index = el.indexOf(':');
    var key = el.substring(0, index);
    var value = el.substring(index + 1);
    tocInfo[key].push(value);
  });

  var flatToc = [];
  tocInfo['BookmarkTitle'].forEach(function (el, i) {
    var item = {
      title: tocInfo.BookmarkTitle[i].trim(),
      level: parseInt(tocInfo.BookmarkLevel[i]),
      pageNumber: parseInt(tocInfo.BookmarkPageNumber[i])
    }
    flatToc.push(item);
  });

  var toc = [];
  var chapter;
  var section;
  flatToc.forEach(function (item) {
    if (item.level == 1) {
      chapter = {
        title: item.title,
        pageNumber: item.pageNumber,
        sections: []
      };
      toc.push(chapter);
    } else if (item.level == 2) {
      section = {
        title: item.title,
        pageNumber: item.pageNumber,
        subSections: []
      };
      chapter.sections.push(section);
    } else if (item.level == 3) {
      var subSection = {
        title: item.title,
        pageNumber: item.pageNumber
      };
      section.subSections.push(subSection);
    }
  });
  return toc;
}

module.exports = extractTOC;
