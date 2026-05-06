var Q = require('q');
var xml2js = require('xml2js');
var he = require('he');
var cheerio = require('cheerio');

var pdfToText = require('./../../cmd/pdfToText');

function _findLinkPageNumber(words, i, headers) {
  while (headers.indexOf(words[i]._) !== -1) {
    i++;
  }
  do {
    var linkPage = Number(words[i]._);
    if (!isNaN(linkPage)) {
      return linkPage;
    }
    i++;
  } while (i < words.length);
  return;
}

function update(toc, pdfInfo) {
  //Atualiza numero de paginas do toc,
  //para o primeiro capitulo comecar na pagina 1
  var chapterNum = 1;

  function _chapterPrefix() {
    //quando tiver partes, nao insere numero no nivel de chapter
    if (pdfInfo.options.partHeaders && pdfInfo.options.partHeaders.length) {
      return '';
    }
    return chapterNum++ + ' ';
  }

  function _sectionPrefix() {
    //quando tiver partes, insere numero no nivel de section
    if (pdfInfo.options.partHeaders && pdfInfo.options.partHeaders.length) {
      return chapterNum++ + ' ';
    }
    return '';
  }

  function _updateSubSection(subSection) {
    var updatedSubSection = {
      title: subSection.title,
      pageNumber: subSection.pageNumber - pdfInfo.content.pageNumberOffset
    };
    return updatedSubSection;
  }

  function _updateSection(section) {
    var updatedSection = {
      title: _sectionPrefix() + section.title,
      pageNumber: section.pageNumber - pdfInfo.content.pageNumberOffset
    };
    var updatedSubSections = [];
    section.subSections.forEach(function (subSection) {
      updatedSubSections.push(_updateSubSection(subSection));
    });
    updatedSection.subSections = updatedSubSections;
    return updatedSection;
  }

  function updateChapter(chapter) {
    var updatedChapter = {
      title: _chapterPrefix() + chapter.title,
      pageNumber: chapter.pageNumber - pdfInfo.content.pageNumberOffset
    };
    var updatedSections = [];
    chapter.sections.forEach(function (section) {
      updatedSections.push(_updateSection(section));
    });
    updatedChapter.sections = updatedSections;
    return updatedChapter;
  }

  var updatedToc = [];
  toc.forEach(function (chapter) {
    updatedToc.push(updateChapter(chapter));
  });
  pdfInfo.toc = updatedToc;
  return updatedToc;

}

function _canonicalText(text) {
  return he.decode(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function _findPageNumber(pages, title, startPage) {
  var canonicalTitle = _canonicalText(title);
  var i;
  for (i = Math.max(startPage - 1, 0); i < pages.length; i++) {
    if (_pageContainsTitle(pages[i], canonicalTitle)) {
      return i + 1;
    }
  }
  return null;
}

function _pageContainsTitle(pageText, canonicalTitle) {
  var lines = pageText.split(/\r?\n/).map(_canonicalText).filter(Boolean);
  var i;
  for (i = 0; i < lines.length; i++) {
    if (lines[i] === canonicalTitle || lines[i].indexOf(canonicalTitle) === 0) {
      return true;
    }
    if (i + 1 < lines.length) {
      var mergedLine = _canonicalText(lines[i] + ' ' + lines[i + 1]);
      if (mergedLine === canonicalTitle || mergedLine.indexOf(canonicalTitle) === 0) {
        return true;
      }
    }
  }
  return false;
}

function _findFirstMatchingPage(pages, titles, startPage) {
  var i;
  for (i = 0; i < titles.length; i++) {
    var pageNumber = _findPageNumber(pages, titles[i], startPage);
    if (pageNumber) {
      return pageNumber;
    }
  }
  return null;
}

function buildFromSummary(pdfInfo) {
  if (pdfInfo.hasParts || !pdfInfo.options.summary || !pdfInfo.options.summary.chapters) {
    return Q.resolve(null);
  }

  return pdfToText.extractText(pdfInfo.originalPDF).then(function (text) {
    var pages = text.split('\f');
    var summaryChapters = pdfInfo.options.summary.chapters;
    var toc = [];
    var nextPage = 1;
    var chapterNumber = 1;

    var i;
    for (i = 0; i < summaryChapters.length; i++) {
      var summaryChapter = summaryChapters[i];
      var chapterTitle = chapterNumber + ' ' + summaryChapter.title;
      var chapterPageNumber = _findFirstMatchingPage(pages, [
        chapterTitle,
        summaryChapter.title,
        'Capítulo ' + chapterNumber
      ], nextPage);
      if (!chapterPageNumber) {
        return null;
      }

      var chapter = {
        title: chapterTitle,
        pageNumber: chapterPageNumber - pdfInfo.content.pageNumberOffset,
        sections: []
      };

      var searchPage = chapterPageNumber;
      (summaryChapter.sections || []).forEach(function (summarySection) {
        var sectionPageNumber = _findPageNumber(pages, summarySection.title, searchPage);
        if (!sectionPageNumber) {
          sectionPageNumber = searchPage;
        }
        chapter.sections.push({
          title: summarySection.title,
          pageNumber: sectionPageNumber - pdfInfo.content.pageNumberOffset,
          subSections: []
        });
        searchPage = sectionPageNumber;
      });

      toc.push(chapter);
      nextPage = chapterPageNumber;
      chapterNumber++;
    }

    pdfInfo.toc = toc;
    return toc;
  });
}

function _findPageNumberInRange(pages, title, startPage, endPage) {
  var canonicalTitle = _canonicalText(title);
  var i;
  for (i = Math.max(startPage - 1, 0); i < Math.min(endPage, pages.length); i++) {
    if (_pageContainsTitle(pages[i], canonicalTitle)) {
      return i + 1;
    }
  }
  return null;
}

function _wordText(word) {
  return word && word._ ? word._ : '';
}

function _wordHeight(word) {
  return Number(word.$.yMax) - Number(word.$.yMin);
}

function _wordsToLines(words) {
  var sortedWords = (words || []).map(function (word) {
    return {
      text: _wordText(word),
      xMin: Number(word.$.xMin),
      yMin: Number(word.$.yMin),
      yMax: Number(word.$.yMax),
      height: _wordHeight(word)
    };
  }).filter(function (word) {
    return word.text;
  }).sort(function (wordA, wordB) {
    if (Math.abs(wordA.yMin - wordB.yMin) > 2) {
      return wordA.yMin - wordB.yMin;
    }
    return wordA.xMin - wordB.xMin;
  });

  var lines = [];
  sortedWords.forEach(function (word) {
    var currentLine = lines[lines.length - 1];
    if (!currentLine || Math.abs(currentLine.yMin - word.yMin) > 2 || Math.abs(currentLine.yMax - word.yMax) > 2) {
      currentLine = {
        words: [],
        xMin: word.xMin,
        yMin: word.yMin,
        yMax: word.yMax,
        height: word.height
      };
      lines.push(currentLine);
    }

    currentLine.words.push(word);
    currentLine.xMin = Math.min(currentLine.xMin, word.xMin);
    currentLine.yMin = Math.min(currentLine.yMin, word.yMin);
    currentLine.yMax = Math.max(currentLine.yMax, word.yMax);
    currentLine.height = currentLine.yMax - currentLine.yMin;
  });

  return lines.map(function (line) {
    line.words.sort(function (wordA, wordB) {
      return wordA.xMin - wordB.xMin;
    });
    return {
      text: line.words.map(function (word) {
        return word.text;
      }).join(' '),
      xMin: line.xMin,
      yMin: line.yMin,
      yMax: line.yMax,
      height: line.height
    };
  });
}

function _layoutPagesFromXml(positions) {
  return (positions.html.body[0].doc[0].page || []).map(function (page) {
    return {
      lines: _wordsToLines(page.word || [])
    };
  });
}

function _linesLookLikeHeading(lines) {
  var avgHeight = 0;
  var i;

  for (i = 0; i < lines.length; i++) {
    avgHeight += lines[i].height;
  }

  avgHeight = avgHeight / lines.length;
  return lines[0].xMin <= 80 && avgHeight >= 18 && lines[lines.length - 1].yMin - lines[0].yMin <= 50;
}

function _findHeadingPageNumberInRange(pages, title, startPage, endPage) {
  var canonicalTitle = _canonicalText(title);
  var bestCandidate = null;
  var pageIndex;

  for (pageIndex = Math.max(startPage - 1, 0); pageIndex < Math.min(endPage, pages.length); pageIndex++) {
    var page = pages[pageIndex];
    var lines = page.lines || [];
    var startIndex;

    for (startIndex = 0; startIndex < lines.length; startIndex++) {
      var groupSize;
      for (groupSize = 1; groupSize <= 3 && startIndex + groupSize <= lines.length; groupSize++) {
        var candidateLines = lines.slice(startIndex, startIndex + groupSize);
        var candidateText = _canonicalText(candidateLines.map(function (line) {
          return line.text;
        }).join(' '));

        if (candidateText !== canonicalTitle && candidateText.indexOf(canonicalTitle) !== 0) {
          continue;
        }

        if (!_linesLookLikeHeading(candidateLines)) {
          continue;
        }

        var avgHeight = candidateLines.reduce(function (sum, line) {
          return sum + line.height;
        }, 0) / candidateLines.length;
        var candidate = {
          pageNumber: pageIndex + 1,
          yMin: candidateLines[0].yMin,
          score: avgHeight * 100 - candidateLines[0].yMin
        };

        if (!bestCandidate || candidate.pageNumber < bestCandidate.pageNumber ||
          (candidate.pageNumber === bestCandidate.pageNumber && candidate.score > bestCandidate.score)) {
          bestCandidate = candidate;
        }
      }
    }

    if (bestCandidate && bestCandidate.pageNumber === pageIndex + 1) {
      return bestCandidate.pageNumber;
    }
  }

  return bestCandidate ? bestCandidate.pageNumber : null;
}

function _chapterNeedsRepair(chapter, nextChapterPageNumber) {
  var previousPageNumber = chapter.pageNumber;
  var i;
  for (i = 0; i < chapter.sections.length; i++) {
    var pageNumber = chapter.sections[i].pageNumber;
    if (pageNumber < previousPageNumber) {
      return true;
    }
    if (nextChapterPageNumber && pageNumber >= nextChapterPageNumber) {
      return true;
    }
    previousPageNumber = pageNumber;
  }
  return false;
}

function repairUsingRenderedText(pdfInfo) {
  if (!pdfInfo.toc || !pdfInfo.toc.length) {
    return Q.resolve(null);
  }

  return Q.all([
    pdfToText.extractTextPositions(pdfInfo.originalPDF).then(_positionXmlToJs),
    pdfToText.extractText(pdfInfo.originalPDF)
  ]).then(function (results) {
    var layoutPages = _layoutPagesFromXml(results[0]);
    var textPages = results[1].split('\f');
    var offset = pdfInfo.content.pageNumberOffset;

    pdfInfo.toc.forEach(function (chapter, chapterIndex) {
      var nextChapter = pdfInfo.toc[chapterIndex + 1];
      var nextChapterPageNumber = nextChapter ? nextChapter.pageNumber : null;
      if (!_chapterNeedsRepair(chapter, nextChapterPageNumber)) {
        return;
      }

      var chapterStartPage = chapter.pageNumber + offset;
      var chapterEndPage = nextChapterPageNumber ? nextChapterPageNumber + offset - 1 : textPages.length;
      var previousFoundPage = chapterStartPage;

      chapter.sections.forEach(function (section) {
        var pageNumber = _findHeadingPageNumberInRange(layoutPages, section.title, previousFoundPage, chapterEndPage);
        if (!pageNumber) {
          pageNumber = _findPageNumberInRange(textPages, section.title, previousFoundPage, chapterEndPage);
        }
        if (pageNumber) {
          section.pageNumber = pageNumber - offset;
          previousFoundPage = pageNumber;
        }
      });
    });

    return pdfInfo.toc;
  });
}

function _getLink(words, page, word, i, title, positionTitle, headers) {
  var decodedSpacelessTitle = he.decode(title.replace(/\s/g, ''));
  if (decodedSpacelessTitle === positionTitle) {
    var link = {
      xMin: Number(word.$.xMin),
      xMax: Number(word.$.xMax),
      yMin: page.$.height - Number(word.$.yMin),
      yMax: page.$.height - Number(word.$.yMax)
    };
    var linkPage = _findLinkPageNumber(words, i, headers);
    if (linkPage) {
      link.page = linkPage;
      return link;
    }
    return;
  }
}

function _headerText(pdfInfo) {
  //skips header text
  var $ = cheerio.load(pdfInfo.options.pdf.summary.headerTemplate);
  var headers = {};
  $('*').each(function () {
    headers[$(this).text()] = true;
  });
  return Object.keys(headers);
}

function _positionXmlToJs(xml) {
  var d = Q.defer();
  return Q().then(function () {
    xml2js.parseString(xml, function (err, result) {
      if (err) {
        console.log('Error transforming position xml to js... :/');
        return d.reject(err);
      }
      console.log('Transformed position xml to js! :)');
      return d.resolve(result);
    });
    return d.promise;
  });
}

function findLinkPositions(tocPdf, pdfInfo) {
  return Q()
    .then(function () {
      return pdfToText.extractTextPositions(tocPdf);
    })
    .then(_positionXmlToJs)
    .then(function (positions) {
      console.log('Building pdf links...');
      var headers = _headerText(pdfInfo);

      var pages = positions.html.body[0].doc[0].page;
      pages.forEach(function (page, i) {
        var words = page.word;
        var pageInfo = {
          links: []
        };
        words.forEach(function (word, i) {
          var positionTitle = word._.replace(/\s/g, '');
          pdfInfo.toc.forEach(function (chapter) {
            var link = _getLink(words, page, word, i, chapter.title, positionTitle, headers);
            if (link) {
              pageInfo.links.push(link);
            } else {
              chapter.sections.forEach(function (section) {
                var link = _getLink(words, page, word, i, section.title, positionTitle, headers);
                if (link) {
                  pageInfo.links.push(link);
                } else {
                  section.subSections.forEach(function (subSection) {
                    var link = _getLink(words, page, word, i, subSection.title, positionTitle, headers);
                    if (link) {
                      pageInfo.links.push(link);
                    }
                  });
                }
              });
            }
          });
        });
        pdfInfo.positions.pages.push(pageInfo);
      });
      console.log('Built pdf links...');
    })
    .then(function () {
      return tocPdf;
    });
}

function getTocItemsByPageNumber(pdfInfo) {
  var tocItemsByPageNumber = {};

  function addTocItem(pageNumber, tocItem) {
    if (!tocItemsByPageNumber[pageNumber]) {
      tocItemsByPageNumber[pageNumber] = [tocItem];
    } else {
      tocItemsByPageNumber[pageNumber].push(tocItem);
    }
  }

  //fazer objeto pageNum -> title
  pdfInfo.toc.forEach(function (chapter) {
    var chapterTocItem = {
      type: 'chapter',
      title: he.decode(chapter.title)
    };
    addTocItem(chapter.pageNumber, chapterTocItem);
    chapter.sections.forEach(function (section) {
      var sectionTocItem = {
        type: 'section',
        title: he.decode(section.title),
        chapter: chapterTocItem
      };
      addTocItem(section.pageNumber, sectionTocItem);
      section.subSections.forEach(function (subSection) {
        var subSectionTocItem = {
          type: 'subSection',
          title: he.decode(subSection.title),
          section: sectionTocItem
        };
        addTocItem(subSection.pageNumber, subSectionTocItem);
      });
    });
  });

  //expandir pageNums
  var tocItemsByPageNumberExpanded = {};
  var previousPageNum;
  Object.keys(tocItemsByPageNumber).forEach(function (pageNumber) {
    pageNumber = parseInt(pageNumber, 10);
    if (previousPageNum && pageNumber - previousPageNum > 1) {
      var i;
      for (i = previousPageNum + 1; i < pageNumber; i++) {
        tocItemsByPageNumberExpanded[i] = tocItemsByPageNumber[previousPageNum].slice(-1)[0];
      }
    }
    tocItemsByPageNumberExpanded[pageNumber] = tocItemsByPageNumber[pageNumber][0];
    previousPageNum = pageNumber;
  });
  if (pdfInfo.content.numberOfPages - previousPageNum > 0) {
    var i;
    for (i = previousPageNum + 1; i <= pdfInfo.content.numberOfPages; i++) {
      tocItemsByPageNumberExpanded[i] = tocItemsByPageNumber[previousPageNum].slice(-1)[0];
    }
  }
  return tocItemsByPageNumberExpanded;
}

module.exports = {
  buildFromSummary: buildFromSummary,
  repairUsingRenderedText: repairUsingRenderedText,
  update: update,
  findLinkPositions: findLinkPositions,
  tocItemsByPageNumber: getTocItemsByPageNumber
};
