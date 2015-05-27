var fs = require("fs");

var Q = require("q");
var kramed = require("kramed");

var calibre = require("./calibre.js");
var htmlRenderer = require("./htmlRenderer.js");

function renderPdfs(files, template, options){
    return Q()
        .then(function(){
            var promises = [];
            files.forEach(function(mdFile){
                var htmlFile = mdFile.replace(".md", ".html");
                var pdfFile = htmlFile.replace(".html", ".pdf");
                promises.push(renderPdf(mdFile, htmlFile, pdfFile, template, options));
            });
            return Q.all(promises);
        });
}

module.exports = {
    renderPdfs: renderPdfs
}

    
function renderPdf(mdFile, htmlFile, pdfFile, template, options){
    return Q().then(function(){
        return Q.nfcall(fs.readFile, mdFile);
    }).then(function(mdData){
        return kramed(mdData.toString());
    }).then(function(htmlSnippet){
        if (template) {
            return htmlRenderer.render({ content: htmlSnippet }, template);
        }
        return htmlSnippet;
    }).then(function (html) {
        return Q.nfcall(fs.writeFile, htmlFile, html);
    }).then(function(){
        var pdfOptions = {
            "--pdf-page-numbers": null,
            "--disable-font-rescaling": true,
            "--paper-size": null,
            "--unit": "millimeter",
            "--chapter": "/",
            "--page-breaks-before": "/",
            "--custom-size": options.pdf.customSize,
            "--margin-left": options.pdf.margin.left,
            "--margin-right": options.pdf.margin.right,
            "--margin-top": options.pdf.margin.top,
            "--margin-bottom": options.pdf.margin.bottom,
            "--pdf-default-font-size": options.pdf.fontSize,
            "--pdf-mono-font-size": options.pdf.fontSize,
            "--pdf-header-template": null,
            "--pdf-footer-template": null
        };
        return calibre.generate(htmlFile, pdfFile, pdfOptions);
    });
}    
