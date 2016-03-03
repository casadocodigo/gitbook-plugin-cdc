var fs = require('fs');

var Q = require('q');
var cheerio = require('cheerio');
var kramed = require('kramed');

var htmlRenderer = require('./../html');
var calibre = require('./../../cmd/calibre');
var imageHelper = require('./../../helpers/imageHelper');
var fileHelper = require('./../../helpers/fileHelper');

function renderPdfs(files, template, pdfInfo) {
  return Q()
    .then(function () {
      var promises = [];
      files.forEach(function (mdFile) {
        var htmlFile = mdFile.replace('.md', '.html');
        var pdfFile = htmlFile.replace('.html', '.pdf');
        promises.push(_renderPdf(mdFile, htmlFile, pdfFile, template, pdfInfo));
      });
      return Q.all(promises);
    });
}

function _renderPdf(mdFile, htmlFile, pdfFile, template, pdfInfo) {
  return Q().then(function () {
    return Q.nfcall(fs.readFile, mdFile);
  }).then(function (mdData) {
    var extension = fileHelper.obtainExtension(pdfInfo.options);
    var htmlSnippet = kramed(mdData.toString());
    var $ = cheerio.load(htmlSnippet);
    var img = $('img');
    if (img.length) {
      imageHelper.adjustImageWidth(img, extension);
      htmlSnippet = $.html();
    }
    return htmlSnippet;
  }).then(function (htmlSnippet) {
    if (template) {
      return htmlRenderer.render({
        content: htmlSnippet,
        options: pdfInfo
      }, template);
    }
    return htmlSnippet;
  }).then(function (html) {
    return Q.nfcall(fs.writeFile, htmlFile, html);
  }).then(function () {
    var pdfOptions = {
      '--pdf-page-numbers': null,
      '--disable-font-rescaling': true,
      '--paper-size': null,
      '--unit': 'millimeter',
      '--chapter': '/',
      '--page-breaks-before': '/',
      '--custom-size': pdfInfo.options.pdf.customSize,
      '--margin-left': pdfInfo.options.pdf.margin.left,
      '--margin-right': pdfInfo.options.pdf.margin.right,
      '--margin-top': pdfInfo.options.pdf.margin.top,
      '--margin-bottom': pdfInfo.options.pdf.margin.bottom,
      '--pdf-default-font-size': pdfInfo.options.pdf.fontSize,
      '--pdf-mono-font-size': pdfInfo.options.pdf.fontSize,
      '--pdf-header-template': null,
      '--pdf-footer-template': null
    };
    return calibre.generate(htmlFile, pdfFile, pdfOptions);
  });
}

module.exports = {
  renderPdfs: renderPdfs
}
