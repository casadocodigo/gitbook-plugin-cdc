var path = require("path");
var calibre = require("./../../calibre.js");

var inputFilename = path.resolve(__dirname , "./toc.html");
var outputFilename = path.resolve(__dirname , "./toc.pdf");

var options = {
    "-d debug": true,
    "--pdf-page-numbers": null,
    "--disable-font-rescaling": true,
    "--paper-size": null,
    "--custom-size": "155x230",
    "--unit": "millimeter",
    "--pdf-default-font-size": "11",
    "--pdf-mono-font-size": "11",
    "--margin-left":"62",
    "--margin-right":"62",
    "--margin-top":"62",
    "--margin-bottom":"62",
    "--pdf-header-template": "<p id='ebook-header' style='border-bottom: 1px solid black; margin-top: 36pt;'><span class='odd_page'><span>Casa do Código</span><span style='float:right'>Sumário</span></span><span class='even_page'><span>Sumário</span><span style='float:right'>Casa do Código</span></span></p>",    
    "--chapter": "/",
    "--page-breaks-before": "/"
};

calibre.generate(inputFilename, outputFilename, options)
.fail(function(error){
    console.log(error);
});