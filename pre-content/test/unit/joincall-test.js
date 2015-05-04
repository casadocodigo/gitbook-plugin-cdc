var assert = require("assert");
var proxyquire = require("proxyquire");

var childProcessStub = {};
var fsStub = {};

var pdftk = proxyquire("./../../pdftk.js", {"child_process": childProcessStub, "fs": fsStub});

describe('pdftk', function(){

    it('should generate pdftk join call without any extras', function(){

        var pdfFile = "index.pdf";
        var files = ["toc.pdf"];
        var outputFile = "index-with-toc.pdf";

        childProcessStub.exec = function(pdftkCall, fn) {
            assert.equal('pdftk A="index.pdf" B="toc.pdf" cat A1 B A3-end output index-with-toc.pdf', pdftkCall);
            fn();
        };
        
        pdftk.join(pdfFile, files, outputFile).done();
    });

    it('should generate pdftk join call with extras', function(){

        var pdfFile = "index.pdf";
        var files = ["copyright.pdf", "ads.pdf", "toc.pdf"];
        var outputFile = "index-with-extras-and-toc.pdf";

        childProcessStub.exec = function(pdftkCall, fn) {
            assert.equal('pdftk A="index.pdf" B="copyright.pdf" C="ads.pdf" D="toc.pdf" cat A1 B C D A3-end output index-with-extras-and-toc.pdf', pdftkCall);
            fn();
        };

        pdftk.join(pdfFile, files, outputFile).done();
        
    });

    
    it('should generate pdftk join call considering spaces in filenames', function(){

        var pdfFile = "index.pdf";
        var files = ["copyright and ads.pdf"];
        var outputFile = "index-with-extras.pdf";
        
        childProcessStub.exec = function(pdftkCall, fn) {
            assert.equal('pdftk A="index.pdf" B="copyright and ads.pdf" cat A1 B A3-end output index-with-extras.pdf', pdftkCall);
            fn();
        };

        pdftk.join(pdfFile, files, outputFile).done();
        
    });

});