var path = require("path");

var fs = require("fs-extra");
var Q = require("q");

var util = require("./../util.js");

var pdftk = require("./pdftk.js");
var tocHandler = require("./toc.js");
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
        preContent: {
            extras: { numberOfPages: 0 },
            intro: { numberOfPages: 0 },
            toc: { numberOfPages: 0 }
        },
        positions: {
            pages: []
        },
        parts: {
            status: {
            },
            mds: [],
            pdfs: []
        },
        options : this.options,
        css: this.plugins.resources.css,
        cssPath: path.join(util.outputPath(this.options), '/gitbook')
    };

    return Q()
    .then(function () {
        return renderTocPDF(outputDir, originalPDF, pdfInfo);
    }).then(function (tocPDF) {
        return tocHandler.findLinkPositions(tocPDF, pdfInfo);
    }).then(function (tocPDF) {
        return handlePreContent(inputDir, outputDir, tocPDF, pdfInfo);
    }).then(function () {
        return pdftk.join(originalPDF, pdfInfo.preContent.files, pdfWithPreContent);
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
        return tocHandler.update(toc, pdfInfo);
    }).then(function (toc) {
        pdfInfo.toc = toc;
        var tocOptions = {
            chapters: toc,
            options: pdfInfo,
            hasParts: pdfInfo.options.partHeaders.length
        };
        return htmlRenderer.render(tocOptions, tocTemplate);
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
            "--pdf-header-template": null,
            "--pdf-footer-template": null
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

    var preContentFiles = [];

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
            console.log("Intro files from '" + introDir+ "': " + introMDs.join(","));
        }
        introMDs.forEach(function (file) {
            var pdfFile = file.replace(".md", ".pdf");
            introFiles.push(pdfFile);
        });
        return introMDs;
    }).then(function (introMDs) {
        var introTemplate = path.resolve(__dirname , 'book/templates/intro.tpl.html');
        return mdRenderer.renderPdfs(introMDs, introTemplate, pdfInfo);
    }).then(function () {
        preContentFiles = extraFiles.concat(introFiles);
        preContentFiles.push(tocPDF);
    }).then(function () {
        return pdftk.extractNumberOfPagesFromFiles(extraFiles);
    }).then(function (numberOfPages) {
        pdfInfo.preContent.extras.numberOfPages = numberOfPages;
    }).then(function () {
        return pdftk.extractNumberOfPagesFromFiles(introFiles);
    }).then(function (numberOfPages) {
        pdfInfo.preContent.intro.numberOfPages = numberOfPages;
    }).then(function () {
        return pdftk.extractNumberOfPagesFromFiles( [tocPDF] );
    }).then(function (numberOfPages) {
        pdfInfo.preContent.toc.numberOfPages = numberOfPages;
    }).then(function () {
        pdfInfo.preContent.files = preContentFiles;
    });
}