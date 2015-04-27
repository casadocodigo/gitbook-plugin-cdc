var assert = require("assert");

var pdftk = require("./../../pdftk.js");

describe('pdftk', function(){

    it('should generate pdftk join call without any extras', function(){

        var pdfFile = "index.pdf";
        var files = ["toc.pdf"];
        var outputFile = "index-with-toc.pdf";
        
        var pdftkCall = pdftk.generatePdftkJoinCall(pdfFile, files, outputFile);
        
        assert.equal('pdftk A="index.pdf" B="toc.pdf" cat A1 B A3-end output index-with-toc.pdf', pdftkCall);
    });

    it('should generate pdftk join call with extras', function(){

        var pdfFile = "index.pdf";
        var files = ["copyright.pdf", "ads.pdf", "toc.pdf"];
        var outputFile = "index-with-extras-and-toc.pdf";
        
        var pdftkCall = pdftk.generatePdftkJoinCall(pdfFile, files, outputFile);
        
        assert.equal('pdftk A="index.pdf" B="copyright.pdf" C="ads.pdf" D="toc.pdf" cat A1 B C D A3-end output index-with-extras-and-toc.pdf', pdftkCall);
    });

    
    it('should generate pdftk join call considering spaces in filenames', function(){

        var pdfFile = "index.pdf";
        var files = ["copyright and ads.pdf"];
        var outputFile = "index-with-extras.pdf";
        
        var pdftkCall = pdftk.generatePdftkJoinCall(pdfFile, files, outputFile);
        
        assert.equal('pdftk A="index.pdf" B="copyright and ads.pdf" cat A1 B A3-end output index-with-extras.pdf', pdftkCall);
    });

});