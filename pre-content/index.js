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
        options : this.options
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
        var pdfOptions = {
            "--pdf-page-numbers": null,
            "--disable-font-rescaling": true,
            "--paper-size": null,
            "--unit": "millimeter",
            "--chapter": "/",
            "--page-breaks-before": "/",
            "--custom-size": pdfInfo.options.pdf.customSize,
            "--margin-left": pdfInfo.options.pdf.margin.left,
            "--margin-right": pdfInfo.options.pdf.margin.right,
            "--margin-top": pdfInfo.options.pdf.margin.top,
            "--margin-bottom": pdfInfo.options.pdf.margin.bottom,
            "--pdf-default-font-size": pdfInfo.options.pdf.fontSize,
            "--pdf-mono-font-size": pdfInfo.options.pdf.fontSize,
            "--pdf-header-template": pdfInfo.options.pdf.summary.headerTemplate,
            "--pdf-footer-template": pdfInfo.options.pdf.summary.footerTemplate
        };
        return calibre.generate(tocHTML, tocPDF, pdfOptions);
    }).then(function () {
        return tocPDF;
    });
}

function handlePreContent(inputDir, outputDir, tocPDF, pdfInfo) {
    var extrasDir = process.env.EXTRAS_DIR || '';
    var inBookExtrasDir = path.join(inputDir, 'extras');
    var introDir = path.join(outputDir, "intro");

    var extraFiles = [];
    var introFiles = [];

    var preContent = [];
    
    return Q().then(function () {
        return dir.listFilesByName(extrasDir, ".pdf");
    }).then(function (extras) {
        if(extras.length) {
            console.log("Extra files from " + extrasDir+ ": " + extras.join(","));
        }
        extraFiles = extras;
    }).then(function () {
        return dir.listFilesByName(inBookExtrasDir, ".pdf");
    }).then(function (extras) {
        if(extras.length) {
            console.log("Extra files from " + inBookExtrasDir+ ": " + extras.join(","));
        }
        extras.forEach(function(file){
            extraFiles.push(file);
        });
    }).then(function () {
        return dir.listFilesByName(introDir, ".md");
    }).then(function (introMDs) {
        if(introMDs.length) {
            console.log("Intro files from " + introDir+ ": " + introMDs.join(","));
        }
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