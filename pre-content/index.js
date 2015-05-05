var path = require("path");

var fs = require("fs-extra");
var Q = require("q");


var util = require("./../util.js");

var pdftk = require("./pdftk.js");
var tocUpdater = require("./toc.js");
var htmlRenderer = require("./htmlRenderer.js");
var calibre = require("./calibre.js");
var dir = require("./dir.js");
var mdRenderer = require("./mdRenderer.js");
var gs = require("./gs.js");

module.exports = {
    "finish": finish
};

function finish() {
    var command = this.options._name;
    var extension = util.obtainExtension(this.options);

    if (extension !== "pdf") {
        return;
    }

    var inputDir = this.options.input;
    var outputDir = this.options.output;

    var originalPDF = path.join(outputDir, "index.pdf");

    var pdfWithPreContent = path.join(outputDir, "./index-with-pre-content.pdf");

    var pdfWithBookmarkInfo = path.join(outputDir, "./index-with-pre-content-and-bookmarks.pdf");
    var pdfWithPageNumberInfo = path.join(outputDir, "./index-with-pre-content-bookmarks-and-page-numbers.pdf");

    var pdfInfo = {
        book : {
            author: this.options.author,
            publisher: this.options.publisher,
            title: this.options.title
        },
        options : util.obtainPdfOptions(this.options)
    };

    return Q().then(function () {
        return renderTocPDF(outputDir, originalPDF, pdfInfo);
    }).then(function (tocPDF) {
        return handlePreContent(inputDir, outputDir, tocPDF, pdfInfo);
    }).then(function (preContent) {
        return pdftk.join(originalPDF, preContent, pdfWithPreContent);
    }).then(function () {
        var pdfBookmarkInfoFile = path.join(outputDir, "./bookmark-info.txt");
        return pdftk.updateBookmarkInfo(pdfWithPreContent, pdfInfo, pdfBookmarkInfoFile, pdfWithBookmarkInfo);
    }).then(function () {
        var pdfPageNumberInfoFile = path.join(outputDir, "./page-number-info.txt");
        return gs.updatePageNumberInfo(pdfWithBookmarkInfo, pdfInfo, pdfPageNumberInfoFile, pdfWithPageNumberInfo);
    }).then(function () {
        if (command === "pdf") {
            return Q.nfcall(fs.copy, pdfWithPageNumberInfo, originalPDF);
        }
        return Q();
    });
}
    
function renderTocPDF(outputDir, originalPDF, pdfInfo) {
    var tocTemplate = path.resolve(__dirname , 'book/templates/toc.tpl.html');
    var tocHTML = path.join(outputDir, "toc.html");
    var tocPDF = path.join(outputDir, "./toc.pdf");

    return Q().then(function () {
        return pdftk.extractTOC(originalPDF);
    }).then(function (toc) {
        return tocUpdater.update(toc);
    }).then(function (toc) {
        pdfInfo.toc = toc;
        return htmlRenderer.render({ chapters: toc }, tocTemplate);
    }).then(function (html) {
        return Q.nfcall(fs.writeFile, tocHTML, html);
    }).then(function () {
        pdfInfo.options["--pdf-header-template"] = "<p id='ebook-header' style='border-bottom: 1px solid black; margin-top: 36pt;'><span class='odd_page'><span>"+pdfInfo.book.publisher+"</span><span style='float:right'>Sumário</span></span><span class='even_page'><span>Sumário</span><span style='float:right'>"+pdfInfo.book.publisher+"</span></span></p>";
        pdfInfo.options["--pdf-footer-template"] = null;
        pdfInfo.options["--chapter"] = "/";
        pdfInfo.options["--page-breaks-before"] = "/";
        return calibre.generate(tocHTML, tocPDF, pdfInfo.options);
    }).then(function () {
        return tocPDF;
    });
}

function handlePreContent(inputDir, outputDir, tocPDF, pdfInfo) {
    var extrasDir = process.env.CDC_EXTRAS_DIR || '';
    var inBookExtrasDir = path.join(inputDir, 'extras');
    var introDir = path.join(outputDir, "intro");

    var extraFiles = [];
    var introFiles = [];

    var preContent = [];
    
    return Q().then(function () {
        return dir.listFilesByName(extrasDir, ".pdf");
    }).then(function (extras) {
        extraFiles = extras;
    }).then(function () {
        return dir.listFilesByName(inBookExtrasDir, ".pdf");
    }).then(function (extras) {
        extras.forEach(function(file){
            extraFiles.push(file);
        });
    }).then(function () {
        return dir.listFilesByName(introDir, ".md");
    }).then(function (introMDs) {
        introMDs.forEach(function (file) {
            var pdfFile = file.replace(".md", ".pdf");
            introFiles.push(pdfFile);
        });
        return introMDs;
    }).then(function (introMDs) {
        var introTemplate = path.resolve(__dirname , 'book/templates/intro.tpl.html');
        return mdRenderer.renderPdfs(introMDs, introTemplate, pdfInfo.options);
    }).then(function () {
        preContent = extraFiles.concat(introFiles);
        preContent.push(tocPDF);
        return preContent;
    }).then(function () {
        return pdftk.extractNumberOfPagesFromFiles(preContent);
    }).then(function (numberOfPages) {
        pdfInfo.preContent = { numberOfPages: numberOfPages };
    }).then(function () {
        return preContent;
    });
}