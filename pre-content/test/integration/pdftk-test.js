var path = require("path");
var fs = require("fs");
var assert = require("assert");

var pdftk = require("./../../pdftk.js");

describe("pdftk", function(){

    it('should get number of pages', function(done){
        pdftk
        .extractNumberOfPages(path.resolve('./index.pdf'))
        .then(function(pN){
            assert.equal(181, pN);
            done();
        });
    });
    

    it('should extract toc', function(done){
        pdftk
        .extractTOC(path.resolve('./index.pdf'))
        .then(function(toc){
            assert.equal("object", typeof toc);
            assert.equal(11, toc.length);
            
            var chapter1 = toc[0];
            assert.equal("1 Introdu&#231;&#227;o", chapter1.title);
            assert.equal(3, chapter1.pageNumber);
            assert.equal(6, chapter1.sections.length);

            var section1_1 = chapter1.sections[0];
            assert.equal("1.1 Mantendo o hist&#243;rico do c&#243;digo", section1_1.title);
            assert.equal(3, section1_1.pageNumber);

            done();
        });
    });

    it('should extract added number of pages of multiple files', function(done){
        
        var index = path.resolve('./index.pdf');
        var copyright = path.resolve('./extras/1-copyright.pdf');
        var propagandas = path.resolve('./extras/2-propagandas.pdf');
        
        var files = [index, copyright, propagandas];
        
        pdftk.extractNumberOfPagesFromFiles(files)
        .then(function(pN){
            assert.equal(184, pN);
            done();
        }).done();
        
    });

    it('should work with spaces in the filename', function(done){
        
        var owasp = path.resolve('./extras/3-copy right e propagandas.pdf');
        
        var files = [owasp];
        
        pdftk.extractNumberOfPagesFromFiles(files)
        .then(function(pN){
            assert.equal(3, pN);
            done();
        }).done();
        
    });

});
