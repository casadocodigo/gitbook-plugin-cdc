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

    var pdfWithPreContent = path.join(outputDir, "./index-with-pre-content.pdf");

    var pdfWithBookmarkInfo = path.join(outputDir, "./index-with-pre-content-and-bookmarks.pdf");
    var pdfWithPageNumberInfo = path.join(outputDir, "./index-with-pre-content-bookmarks-and-page-numbers.pdf");

    var pdfInfo = {
        book : {
            author: this.options.author,
            publisher: this.options.publisher,
            title: this.options.title
        },
        content: {
            //O toc original, gerado pelo gitbook/calibre, tem sempre apenas uma pagina.
            //isso é garantido pq o conteudo do toc original nao é visivel (display:none).
            //descontando 1 pagina para a capa + uma pagina para o toc original
            pageNumberOffset: 2,
            originalNumberOfPages: 0,
            numberOfPages: 0
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
        originalPDF: path.join(outputDir, "./index.pdf"),
        hasParts: this.options.partHeaders.length > 0,
        css: this.plugins.resources.css,
        cssPath: path.join(util.outputPath(this.options), './gitbook')
    };

    return Q()
    .then(function () {
        return pdftk.extractNumberOfPagesFromFiles([pdfInfo.originalPDF]);
    }).then(function (numberOfPages) {
        pdfInfo.content.originalNumberOfPages = numberOfPages;
        pdfInfo.content.numberOfPages = numberOfPages - pdfInfo.content.pageNumberOffset;
    }).then(function () {
        return renderTocPDF(outputDir, pdfInfo);
    }).then(function (tocPDF) {
        return tocHandler.findLinkPositions(tocPDF, pdfInfo);
    }).then(function (tocPDF) {
        return handlePreContent(inputDir, outputDir, tocPDF, pdfInfo);
    }).then(function () {
        return headerAndFooter(pdfInfo);
    }).then(function () {
        return pdftk.join(pdfInfo.pdfWithHeaderAndFooter, pdfInfo.preContent.files, pdfWithPreContent);
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

function headerAndFooter(pdfInfo) {
    return Q().then(function () {
        pdfInfo.headerFooterDir = path.join(pdfInfo.options.output, "./header-footer");
        return Q.nfcall(fs.mkdir, pdfInfo.headerFooterDir);
    }).then(function () {
        var tocItemsByPageNumber = tocHandler.tocItemsByPageNumber(pdfInfo);
        //renderizar pdf com cabeçalho e rodapé (inclusive imagens)
        var promises = [];
        var pageNumbers = Object.keys(tocItemsByPageNumber)
        var lastPageNumber = pageNumbers.length;
        pageNumbers.forEach(function(pageNumber){
            pageNumber = parseInt(pageNumber);
            var next = undefined;
            if (pageNumber + 1 <= lastPageNumber){
                next = pageNumber + 1;
            }
            var tocItem = tocItemsByPageNumber[pageNumber];
            var promise = Q().then(function(){
                var headerFooterOptions = {
                    tocItem: tocItem,
                    pageNumber: pageNumber,
                    next: next,
                    options: pdfInfo
                };
                return htmlRenderer.render(headerFooterOptions, pdfInfo.options.pdf.headerFooterTemplate);
            }).then(function(html){
                var headerFooterPath = path.join(pdfInfo.headerFooterDir, "./"+pageNumber+".html");
                return Q.nfcall(fs.writeFile, headerFooterPath, html);
            });
            promises.push(promise);
        });
        return Q.all(promises);
    }).then(function () {
        return Q()
            .then(function(){
                var headerFooterOptions = {
                    tocItem: null,
                    pageNumber: null,
                    next: "blank-toc",
                    options: pdfInfo
                };
                return htmlRenderer.render(headerFooterOptions, pdfInfo.options.pdf.headerFooterTemplate);
            })
            .then(function(html){
                var headerFooterPath = path.join(pdfInfo.headerFooterDir, "./blank-cover.html");
                return Q.nfcall(fs.writeFile, headerFooterPath, html);
            })
            .then(function(){
                var headerFooterOptions = {
                    tocItem: null,
                    pageNumber: null,
                    next: "1",
                    options: pdfInfo
                };
                return htmlRenderer.render(headerFooterOptions, pdfInfo.options.pdf.headerFooterTemplate);
            })
            .then(function(html){
                var headerFooterPath = path.join(pdfInfo.headerFooterDir, "./blank-toc.html");
                return Q.nfcall(fs.writeFile, headerFooterPath, html);
            });
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
            "--pdf-footer-template": null,
            "--max-levels": pdfInfo.content.originalNumberOfPages,
            "--breadth-first": true
        };
        var firstHeaderFooterHtmlPath = path.join(pdfInfo.headerFooterDir, "./blank-cover.html");
        pdfInfo.headerFooterPath = path.join(pdfInfo.headerFooterDir, "./header-footer.pdf");
        return calibre.generate(firstHeaderFooterHtmlPath, pdfInfo.headerFooterPath, pdfOptions);
    }).then(function(){
        pdfInfo.pdfWithHeaderAndFooter = path.join(pdfInfo.options.output, "./index-with-header-and-footer.pdf");
        return pdftk.multistamp(pdfInfo.headerFooterPath, pdfInfo.originalPDF, pdfInfo.pdfWithHeaderAndFooter);
    });
}

function renderTocPDF(outputDir, pdfInfo) {
    pdfInfo.tocHTML = path.join(outputDir, "toc.html");
    return Q().then(function () {
        return pdftk.extractTOC(pdfInfo.originalPDF);
    }).then(function (toc) {
        return tocHandler.update(toc, pdfInfo);
    }).then(function () {
        var tocOptions = {
            chapters: pdfInfo.toc,
            options: pdfInfo
        };
        return htmlRenderer.render(tocOptions, pdfInfo.options.pdf.tocTemplate);
    }).then(function (html) {
        return Q.nfcall(fs.writeFile, pdfInfo.tocHTML, html);
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
        pdfInfo.tocPDF = path.join(outputDir, "./toc.pdf");
        return calibre.generate(pdfInfo.tocHTML, pdfInfo.tocPDF, pdfOptions);
    }).then(function () {
        return pdfInfo.tocPDF;
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
        return mdRenderer.renderPdfs(introMDs, pdfInfo.options.pdf.introTemplate, pdfInfo);
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