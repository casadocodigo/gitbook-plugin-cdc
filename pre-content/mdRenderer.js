var fs = require("fs");

var Q = require("q");
var kramed = require("kramed");

var calibre = require("./calibre.js");
var htmlRenderer = require("./htmlRenderer.js");

function renderPdfs(files, template, pdfOptions){
    return Q()
        .then(function(){
            var promises = [];
            files.forEach(function(mdFile){
                var htmlFile = mdFile.replace(".md", ".html");
                var pdfFile = htmlFile.replace(".html", ".pdf");
                promises.push(renderPdf(mdFile, htmlFile, pdfFile, template, pdfOptions));
            });
            return Q.all(promises);
        });
}

module.exports = {
    renderPdfs: renderPdfs
}

    
function renderPdf(mdFile, htmlFile, pdfFile, template, pdfOptions){
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
        pdfOptions["--pdf-header-template"] = null;
        pdfOptions["--chapter"] = "/";
        pdfOptions["--page-breaks-before"] = "/";
        return calibre.generate(htmlFile, pdfFile, pdfOptions);
    });
}    
