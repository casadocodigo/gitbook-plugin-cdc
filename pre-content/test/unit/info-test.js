var assert = require("assert");
var proxyquire = require("proxyquire");

var childProcessStub = {};
var fsStub = {};

var pdftk = proxyquire("./../../pdftk.js", {"child_process": childProcessStub, "fs": fsStub});

describe('pdftk', function(){
    it('should generate one level bookmark info', function(){
        
        var info =  {
            "toc":[
                    {
                        "title":"1 Introdu&#231;&#227;o",
                        "pageNumber":3
                    }
            ],
            "preContent": { "numberOfPages": 9 }
        };

        fsStub.writeFile = function(infoFile, bookmarkInfo) {
            assert.equal("info.txt", infoFile);
            
            assert.equal("string", typeof bookmarkInfo);
            assert(bookmarkInfo.length > 0);
            var lines = bookmarkInfo.split("\n");
            assert.equal(5, lines.length);
            assert.equal("BookmarkBegin", lines[0]);
            assert.equal("BookmarkTitle: 1 Introdu&#231;&#227;o", lines[1]);
            assert.equal("BookmarkLevel: 1", lines[2]);
            assert.equal("BookmarkPageNumber: 13", lines[3]);
            assert.equal("", lines[4]);
        };

        childProcessStub.exec = function(pdftkCall, fn){
            assert.equal('pdftk input.pdf update_info info.txt output output.pdf', pdftkCall);
            fn();
        };

        pdftk.updateBookmarkInfo('input.pdf', info, 'info.txt', 'output.pdf').done();
        
    });
    
    it('should generate two level bookmark info', function(){
        
        var info =  {
            "toc":[
                {
                    "title":"1 Introdu&#231;&#227;o",
                    "pageNumber":3,
                    "sections":[
                        {
                           "title":"1.1 Mantendo o hist&#243;rico do c&#243;digo",
                           "pageNumber":3
                        }
                    ]
                }
            ],
            "preContent": { "numberOfPages": 9 }
        };

        fsStub.writeFile = function(infoFile, bookmarkInfo) {
            assert.equal("info.txt", infoFile);

            assert.equal("string", typeof bookmarkInfo);
            assert(bookmarkInfo.length > 0);
            var lines = bookmarkInfo.split("\n");
            assert.equal(9, lines.length);
            assert.equal("BookmarkBegin", lines[0]);
            assert.equal("BookmarkTitle: 1 Introdu&#231;&#227;o", lines[1]);
            assert.equal("BookmarkLevel: 1", lines[2]);
            assert.equal("BookmarkPageNumber: 13", lines[3]);
            assert.equal("BookmarkBegin", lines[4]);
            assert.equal("BookmarkTitle: 1.1 Mantendo o hist&#243;rico do c&#243;digo", lines[5]);
            assert.equal("BookmarkLevel: 2", lines[6]);
            assert.equal("BookmarkPageNumber: 13", lines[7]);
            assert.equal("", lines[8]);
        };
        
        childProcessStub.exec = function(pdftkCall, fn){
            assert.equal('pdftk input.pdf update_info info.txt output output.pdf', pdftkCall);
            fn();
        };

        pdftk.updateBookmarkInfo('input.pdf', info, 'info.txt', 'output.pdf').done();
    });
    
});