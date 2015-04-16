var Q = require("q");

var fs = require("fs");

var kramed = require("kramed");

var calibre = require("./calibre.js");
var htmlRenderer = require("./htmlRenderer.js");
    
var ebookPlugin = require("./../gitbook-plugin-casa-do-codigo-ebook");

function renderPdf(mdFile, htmlFile, pdfFile, template){
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
        ebookPlugin.pdfOptions["--pdf-header-template"] = null;
        ebookPlugin.pdfOptions["--chapter"] = "/";
        ebookPlugin.pdfOptions["--page-breaks-before"] = "/";
        return calibre.generate(htmlFile, pdfFile, ebookPlugin.pdfOptions);
    });
}    

function renderPdfs(files, template){
    return Q()
        .then(function(){
            var promises = [];
            files.forEach(function(mdFile){
                var htmlFile = mdFile.replace(".md", ".html");
                var pdfFile = htmlFile.replace(".html", ".pdf");
                promises.push(renderPdf(mdFile, htmlFile, pdfFile, template));
            });
            return Q.all(promises);
        });
}

module.exports = {
    renderPdfs: renderPdfs
}