var assert = require("assert");
var proxyquire = require("proxyquire");

var childProcessStub = {};
var fsStub = {};

var gs = proxyquire("./../../gs.js", {"child_process": childProcessStub, "fs": fsStub});

describe('gs', function(){

    it('should generate page info', function(){
        
        var info =  {
            "book": {
                "title": "Git e GitHub",
                "author": "Alexandre",
                "publisher": "Caelum"
            },
            "preContent": { "numberOfPages": 9 }
        };

        fsStub.writeFile = function(infoFile, pageInfo) {
            assert.equal("info.txt", infoFile);
            
            assert.equal("string", typeof pageInfo);
            assert(pageInfo.length > 0);
            var lines = pageInfo.split("\n");
            assert.equal(11, lines.length);
            assert.equal("[ /Title (Git e GitHub)", lines[0]);
            assert.equal("/Author (Alexandre)", lines[1]);
            assert.equal("/Creator (Caelum)", lines[2]);
            assert.equal("/Producer (Caelum)", lines[3]);
            assert.equal("/DOCINFO pdfmark", lines[4]);
            assert.equal("[/_objdef {pl} /type /dict /OBJ pdfmark", lines[5]);
            assert.equal("[{pl} <</Nums [ ", lines[6]);
            assert.equal("0 << /S /r >> ", lines[7]);
            assert.equal("10 << /S /D /St 1 >> ", lines[8]);
            assert.equal("]>> /PUT pdfmark", lines[9]);
            assert.equal("[{Catalog} <</PageLabels {pl}>> /PUT pdfmark", lines[10]);
        };

        childProcessStub.exec = function(pdftkCall, fn){
            assert.equal('gs -q -o output.pdf -sDEVICE=pdfwrite input.pdf info.txt', pdftkCall);
            fn();
        };

        gs.updatePageNumberInfo('input.pdf', info, 'info.txt', 'output.pdf').done();
        
    });

});