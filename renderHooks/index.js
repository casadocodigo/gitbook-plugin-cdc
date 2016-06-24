var path = require('path');
var fs = require('fs');

var cheerio = require('cheerio');
var kramed = require('kramed');

var fileHelper = require('./../helpers/fileHelper');
var imageHelper = require('./../helpers/imageHelper');

var CHAPTER_HEADER_TITLE = 'Capítulo ';
var CAPTION_PREFIX = 'Figura ';
var TOC_TITLE = 'Sumário';

function handleSummaryAfter(summary) {
  var options = this.options;

  _renderIntro(options);

  _renderParts(summary, options);

  return summary;
}

function handlePageBefore(page) {
  var maxLength = this.options.maxLineLength || 80;
  var filename = page.path == 'README.md' ? this.options.firstChapter + '.md' : page.path;
  var dentroDeCode = false;

  //nao foi utilizada regex para manter numero de linha (i)
  page.content.split('\n').forEach(function (line, i) {
    if (!dentroDeCode && line.trim().indexOf('```') == 0) {
      dentroDeCode = true; //comecando um novo code
      if (line.trim() != '```' && line.trim().lastIndexOf('```') == line.trim().length - 3) {
        dentroDeCode = false; //code de uma linha só
      }
    } else if (dentroDeCode && line.trim().indexOf('```') == 0) {
      dentroDeCode = false; //terminando um code anterior
    }

    if (dentroDeCode && line.length > maxLength) {
      console.log('warning: code "' + line.trim().substring(0, 30) + '"... too long. was ' + line.length + ' (max ' + maxLength + ') in ' + filename + ':' + (i + 1));
    }
  });
  return page;
}

function handlePage(page) {
  var options = this.options;

  var chapter = page.progress.current;
  _verifyChapterTitle(chapter);

  page.sections.forEach(function (section) {
    if (section.type === 'normal') {
      var $ = cheerio.load(section.content);
      _addSectionNumbers($, chapter, section, options);
      _adjustImages($, chapter, section, options);
      _removeComments($, section);
    }
  });

  return page;
}

var partsAddedToPages = {};
function handlePageAfter(page) {
  var options = this.options;

  var chapter = page.progress.current;

  if (options.partsByPathOfFirstChapter) {
    var part = options.partsByPathOfFirstChapter[chapter.path];
    if (part && !partsAddedToPages[part.title]) {
      var partHeaderHtml = part.partHeaderHtml;
      var partHeader = '<div class="part-header">\n' + partHeaderHtml + '</div>\n';
      var $ = cheerio.load(page.content);
      $('.page').prepend(partHeader);
      page.content = $.html();
      partsAddedToPages[part.title] = true;
    }
  }

  if (!_isIntroFile(chapter, options)) {
    //inserindo numero do capitulo
    //tem que fazer no page:after
    //pq o h1 com titulo do capitulo
    //é colocado depois do hook de page
    var $ = cheerio.load(page.content);
    var chapterHeader =
      $('<div>')
      .addClass('chapterHeader')
      .text(CHAPTER_HEADER_TITLE + _obtainChapterNumber(chapter, options));
    $('h1.book-chapter')
      .before(chapterHeader);

    page.content = $.html();
  }

  return page;
}


function handleEbookBefore(options) {

  var extension = fileHelper.obtainExtension(this.options);

  //options['-d debug'] = true;

  options['--publisher'] = this.options.publisher;

  options['--chapter-mark'] = 'none';

  options['--level1-toc'] = 'descendant-or-self::*[contains(concat(" ", normalize-space(@class), " "), " book-chapter-1 ")]';
  options['--level2-toc'] = '//h:h2';
  options['--level3-toc'] = null;
  if (this.options.partHeaders && this.options.partHeaders.length) {
    options['--level1-toc'] = '//*[@class="part-header"]/h:h1[1]';
    options['--level2-toc'] = 'descendant-or-self::*[contains(concat(" ", normalize-space(@class), " "), " book-chapter-1 ")]';
    options['--level3-toc'] = '//h:h2';
  }

  if (extension === 'mobi') {
    options['--mobi-keep-original-images'] = true;
    options['--toc-title'] = TOC_TITLE;
  }

  if (extension === 'pdf') {
    //só pra PDF
    options['--pdf-page-numbers'] = null;
    options['--disable-font-rescaling'] = true;
    options['--paper-size'] = null;
    options['--custom-size'] = this.options.pdf.customSize;
    options['--unit'] = 'millimeter';
  }

  options['--pdf-header-template'] = null;
  options['--pdf-footer-template'] = null;

  return options;
}

function _renderIntro(options) {
  var extension = fileHelper.obtainExtension(options); //para epub e mobi não precisa renderizar intro, porque já está no SUMMARY.md
  if (extension == 'epub' || extension == 'mobi') {
    return;
  }

  options.intro = [];

  var introDir = path.join(options.input, 'intro');
  if (!fs.existsSync(introDir)) {
    return;
  }

  var files = fs.readdirSync(introDir);
  var filtered = files.filter(function (file) {
    return path.extname(file) === '.md';
  });
  var sortedByName = filtered.sort(function (a, b) {
    return a.localeCompare(b);
  });
  var mdFiles = sortedByName.map(function (file) {
    return path.resolve(introDir, file);
  });
  mdFiles.forEach(function (mdFile) {
    var mdData = fs.readFileSync(mdFile);
    var htmlSnippet = kramed(mdData.toString());
    var $ = cheerio.load(htmlSnippet);
    var title = $('h1').first().text();
    $('img').each(function(i){
      var img = $(this);
      imageHelper.adjustImageWidth(img, extension);
      var captionPrefix = CAPTION_PREFIX + (i + 1);
      imageHelper.insertImageCaption($, img, captionPrefix);
    });
    htmlSnippet = $.html();
    options.intro.push({
      title: title,
      content: htmlSnippet
    });
  });
}

function _renderParts(summary, options) {
  if (options.partHeaders && options.partHeaders.length) { //se tiver partes
    var extension = fileHelper.obtainExtension(options);

    var partHeaders = {};
    var numChapters = 0;
    var partsByPathOfFirstChapter = {};

    summary.content.chapters.forEach(function (chapter) {
      var chapterPath = chapter.path == 'README.md' ? options.firstChapter + '.md' : chapter.path;
      var chapterDir = path.dirname(chapterPath);
      if (chapterDir.indexOf('part-') == 0) {
        var partHeaderPath = options.partHeaders.filter(function (partHeader) {
          return path.dirname(partHeader) == chapterDir;
        })[0];

        if (!partHeaderPath) {
          return;
        }
        if (!partHeaders[partHeaderPath]) {
          var partHeaderFile = path.join(options.input, partHeaderPath);
          var partHeaderMd = fs.readFileSync(partHeaderFile);
          var partHeaderHtml = kramed(partHeaderMd.toString());

          var $ = cheerio.load(partHeaderHtml);
          var partTitle = $('h1').first().text();
          $('img').each(function(i){
            var img = $(this);
            if (chapter.path == 'README.md') {
              _stripLeadingRelativePath(img);
            }
            imageHelper.adjustImageWidth(img, extension);
            var captionPrefix = CAPTION_PREFIX + (i + 1);
            imageHelper.insertImageCaption($, img, captionPrefix);
          });
          partHeaderHtml = $.html();

          var part = {
            title: partTitle,
            chapters: [{
              title: (++numChapters) + ' ' + chapter.title,
              path: chapter.path
            }],
            partHeaderPath: partHeaderPath,
            partHeaderHtml: partHeaderHtml
          };
          partHeaders[partHeaderPath] = part;
          partsByPathOfFirstChapter[chapter.path] = part;
        } else {
          var part = partHeaders[partHeaderPath];
          part.chapters.push({
            title: (++numChapters) + ' ' + chapter.title,
            path: chapter.path
          });
        }

      }
    });
    options.partsByPathOfFirstChapter = partsByPathOfFirstChapter;
    var parts = [];
    Object.keys(partHeaders).forEach(function (partHeaderPath) {
      parts.push(partHeaders[partHeaderPath]);
    });
    options.parts = parts;
  }
}

function _verifyChapterTitle(chapter) {
  var chapterTitle = chapter.title;
  if (/^[0-9]/.test(chapterTitle)) {
    throw new Error('Chapter cant begin with numbers: ' + chapterTitle);
  }
}

function _obtainChapterNumber(chapter, options) {
  //obtem numero do capitulo a partir de info do gitbook
  var chapterLevel = Number(chapter.level);
  var numIntroChapters = Number(options.numIntroChapters);
  return chapterLevel - numIntroChapters + 1;
}

function _addSectionNumbers($, chapter, section, options) {

  if (_isIntroFile(chapter, options)) {
    return;
  }

  var summary = options.summary;
  var firstChapter = options.firstChapter;

  var chapterNumber = _obtainChapterNumber(chapter, options);
  //obtem nome das secoes a partir dos h2
  var sections = [];
  $('h2').each(function (i) {
    var h2 = $(this);
    var sectionTitle = _sectionNumber(chapterNumber, h2.text(), i);
    sections.push({
      title: sectionTitle,
      id: h2.attr('id')
    });
    h2.text(sectionTitle);
  });
  var summaryChapter = summary.chapters.filter(function (summaryChapter) {
    return summaryChapter.path == chapter.path;
  })[0];
  summaryChapter.sections = sections;
  summaryChapter.htmlPath = summaryChapter.path == 'README.md' ? firstChapter + '.html' : summaryChapter.path.replace('.md', '.html');
  section.content = $.html();
}

function _sectionNumber(chapterNumber, text, i) {
  return chapterNumber + '.' + (i + 1) + ' ' + text;
}

function _adjustImages($, chapter, section, options) {
  var extension = fileHelper.obtainExtension(options);
  var chapterNumber = _obtainChapterNumber(chapter, options);
  $('img').each(function (i) {
    var img = $(this);
    //se o primeiro capitulo original tiver dentro de pastas, deve tirar os ../
    if (chapter.path == 'README.md' && options.firstChapter.indexOf('/') > 0) {
      _stripLeadingRelativePath(img);
    }
    imageHelper.adjustImageWidth(img, extension);
    var captionPrefix = CAPTION_PREFIX + chapterNumber + '.' + (i + 1);
    imageHelper.insertImageCaption($, img, captionPrefix);
  });
  section.content = $.html();
}

function _stripLeadingRelativePath(img) {
  var imgSrc = img.attr('src');
  imgSrc = imgSrc.replace(/^\.\.\//, '');
  img.attr('src', imgSrc);
}

function _removeComments($, section) {
  $.root()
    .contents()
    .filter(function () {
      return this.type === 'comment';
    })
    .remove();
  section.content = $.html();
}

function _isIntroFile(chapter, options) {
  //para epub e mobi, .md da intro sao colocados no SUMMARY
  var extension = fileHelper.obtainExtension(options);
  var numIntroChapters = options.numIntroChapters;
  if ((extension == 'epub' || extension == 'mobi') && numIntroChapters > 0 && (chapter.path == 'README.md' || chapter.path.indexOf('intro') == 0)) {
    return true;
  }
  return false;
}

module.exports = {
  'handleSummaryAfter': handleSummaryAfter,
  'handlePageBefore': handlePageBefore,
  'handlePage': handlePage,
  'handlePageAfter': handlePageAfter,
  'handleEbookBefore': handleEbookBefore
};