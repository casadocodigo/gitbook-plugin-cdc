var exec = require('child_process').exec;
var fs = require("fs");

var Q = require("q");

//var NAO_MUDAR_IMAGENS = '-dColorConversionStrategy=/LeaveColorUnchanged -dEncodeColorImages=false -dEncodeGrayImages=false -dEncodeMonoImages=false '; //colocar para nao perder detalhes das imagens. problema: arquivo fica gigante!

function updatePageNumberInfo(inputFile, pageInfo, pageInfoFile, outputFile){
    console.log("gs - Preparing to update page number info...");
    var d = Q.defer();
    return Q().
            then(function(output) {
                return Q.nfcall(fs.writeFile, pageInfoFile, pageNumberInfo(pageInfo), { encoding: "ascii"});
            }).
            then(function(){
                var gsCall = 'gs -q -o ' + outputFile + ' -sDEVICE=pdfwrite ' + inputFile + ' ' + pageInfoFile;

                console.log("gs - Calling gs...");
                console.log(gsCall);
        
                exec(gsCall, function (error, stdout, stderr) {
                    if (error) {
                        console.log("gs - Error while updating page number info. :/");
                        return d.reject(error);
                    }
                    console.log("gs - Updated page number info! :)");
                    return d.resolve();
                });
                return d.promise;
            });
}

module.exports = {
    updatePageNumberInfo: updatePageNumberInfo
};

function pageNumberInfo(info){
    var firstChapterPageNumber = info.preContent.extras.numberOfPages + info.preContent.intro.numberOfPages + info.preContent.toc.numberOfPages + 1;
    
    var pdfMarks = "";
    pdfMarks += "[ /Title ("+info.book.title+")\n";
    pdfMarks += "/Author ("+info.book.author+")\n";
    pdfMarks += "/Creator ("+info.book.publisher+")\n";
    pdfMarks += "/Producer ("+info.book.publisher+")\n";
    pdfMarks += "/DOCINFO pdfmark\n";
    pdfMarks += "[/_objdef {pl} /type /dict /OBJ pdfmark\n";
    pdfMarks += "[{pl} <</Nums [ \n"
    pdfMarks += "0 << /S /r >> \n"; //capa e sumário em números romanos
    pdfMarks += firstChapterPageNumber + " << /S /D /St 1 >> \n";
    pdfMarks += "]>> /PUT pdfmark\n";
    pdfMarks += "[{Catalog} <</PageLabels {pl}>> /PUT pdfmark\n\n";

    info.positions.pages.forEach(function(page, i) {
        page.links.forEach(function(link){
            pdfMarks += "[\n";
            pdfMarks += "/Rect [ " + link.xMin.toFixed() + " " + link.yMin.toFixed() + " " + link.xMax.toFixed() + " " + link.yMax.toFixed() + " ]\n";
            pdfMarks += "/Border [ 0 0 1 ]\n";
            pdfMarks += "/Color [ 0 0 1 ]\n";
            pdfMarks += "/Page " + (firstChapterPageNumber + link.page) + "\n";
            pdfMarks += "/SrcPg " + (i+2+info.preContent.extras.numberOfPages + info.preContent.intro.numberOfPages) + "\n";
            pdfMarks += "/Subtype /Link\n";
            pdfMarks += "/ANN pdfmark\n\n";
        });
    });

    return pdfMarks;
}


/*
$ 

% Type name (Optional) The type of PDF object that this dictionary describes; if present, must be PageLabel for a page label dictionary.
%       S name (Optional) The numbering style to be used for the numeric portion of each page label:
%       D Decimal arabic numerals
%       R Uppercase roman numerals
%       r Lowercase roman numerals
%       A Uppercase letters (A to Z for the first 26 pages, AA to ZZ for the next 26, and so on)
%       a Lowercase letters (a to z for the first 26 pages, aa to zz for the next 26, and so on)
% P text string (Optional) The label prefix for page labels in this range.
% St integer (Optional) The value of the numeric portion for the first page label in the range. Subsequent pages will be numbered sequentially from this value, which must be greater than or equal to 1. Default value: 1.

% renumber first 25 pages - push each by 10, and add prefix:
% [/_objdef {pl} /type /dict /OBJ pdfmark
% [{pl} <</Nums [0 <</P (Page ) /S /D /St 10>> 25 <<>>]>> /PUT pdfmark
% [{Catalog} <</PageLabels {pl}>> /PUT pdfmark

% gs -q -o modified.pdf -sDEVICE=pdfwrite book.pdf pdfmarks

[/_objdef {pl} /type /dict /OBJ pdfmark
[{pl} <</Nums [ 0 << /S /r >>         % just label -1 (no style) for pg 0;
                3 << /S /D /St 3 >>     % decimal style, start from 1, for pg2 and on.
                ]>> /PUT pdfmark
[{Catalog} <</PageLabels {pl}>> /PUT pdfmark

References:

http://askubuntu.com/questions/32048/renumber-pages-of-a-pdf
http://superuser.com/questions/232553/how-to-change-internal-page-numbers-in-the-meta-data-of-a-pdf
http://www.ghostscript.com/doc/current/Use.htm
*/
