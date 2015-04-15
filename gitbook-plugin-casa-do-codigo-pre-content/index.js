var path = require("path");

var fs = require("fs-extra");
var Q = require("q");


var theme = require("gitbook-theme-casa-do-codigo");
var ebookPlugin = require("gitbook-plugin-casa-do-codigo-ebook");

var pdftk = require("./pdftk.js");
var tocUpdater = require("./toc.js");
var htmlRenderer = require("./htmlRenderer.js");
var calibre = require("./calibre.js");
var gs = require("./gs.js");
var dir = require("./dir.js");
var mdRenderer = require("./mdRenderer.js");

module.exports = {
	hooks: {
        "finish": function () {
            var command = this.options._name;
            var extension = theme.obtainExtension(this.options);
            
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
                }
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
    }
};

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
        ebookPlugin.pdfOptions["--pdf-header-template"] = "<p id='ebook-header' style='border-bottom: 1px solid black; margin-top: 36pt;'><span class='odd_page'><span>Casa do Código</span><span style='float:right'>Sumário</span></span><span class='even_page'><span>Sumário</span><span style='float:right'>Casa do Código</span></span></p>";
        ebookPlugin.pdfOptions["--chapter"] = "/";
        ebookPlugin.pdfOptions["--page-breaks-before"] = "/";
        return calibre.generate(tocHTML, tocPDF, ebookPlugin.pdfOptions);
    }).then(function () {
        return tocPDF;
    });
}

function handlePreContent(inputDir, outputDir, tocPDF, pdfInfo) {
    var extrasDir = path.join(inputDir, 'extras');
    var introDir = path.join(outputDir, "intro");

    var extraFiles = [];
    var introFiles = [];

    var preContent = [];
    
    return Q().then(function () {
        return dir.listFilesByName(extrasDir);
    }).then(function (extras) {
        extraFiles = extras;
    }).then(function () {
        return dir.listFilesByName(introDir);
    }).then(function (introMDs) {
        introMDs.forEach(function (file) {
            var pdfFile = file.replace(".md", ".pdf");
            introFiles.push(pdfFile);
        });
        return introMDs;
    }).then(function (introMDs) {
        var introTemplate = path.resolve(__dirname , 'book/templates/intro.tpl.html');
        return mdRenderer.renderPdfs(introMDs, introTemplate);
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