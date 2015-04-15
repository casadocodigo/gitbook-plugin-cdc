var exec = require('child_process').exec;
var fs = require("fs");

var Q = require("q");

function extractNumberOfPages(pdfFile) {
    console.log("pdftk - Preparing to extract number of pages...")
    
    var d = Q.defer();

    return Q().then(function () {
    
        var pdftkCall = 'pdftk ' + pdfFile + ' dump_data';

        console.log("pdftk - Calling pdftk...")

        exec(pdftkCall, function (error, stdout, stderr) {
            if (error) {
                console.log("pdftk - Error while extracting number of pages. :/");
                return d.reject(error);
            }

            var numberOfPages =
                stdout
                .split("\n")
                .filter(function(line){
                    return line.indexOf("NumberOfPages") == 0;
                })[0].split(":")[1];

            console.log("pdftk - Extracted number of pages! :)");
            return d.resolve(parseInt(numberOfPages));
        });
        
        return d.promise;

    });
}

function extractNumberOfPagesFromFiles(files){
    var d = Q.defer();

    return Q().then(function () {
    
        var promises = [];
        files.forEach(function(file){
            promises.push(extractNumberOfPages(file));
        });

        Q.all(promises)
        .spread(function(){
            var sum = [].
                        reduce
                        .call(arguments, function(a, b) {
                            return a + b;
                        });
            return d.resolve(sum);
        }, function(error){
            return d.reject(error);
        });

        return d.promise;

    });
}

function extractTOC(pdfFile) {
    
    console.log("pdftk - Preparing to extract toc...")
    
    var d = Q.defer();

    return Q().then(function () {
    
        var pdftkCall = 'pdftk ' + pdfFile + ' dump_data';

        console.log("pdftk - Calling pdftk...")

        exec(pdftkCall, function (error, stdout, stderr) {
            if (error) {
                console.log("pdftk - Error while extracting TOC. :/");
                return d.reject(error);
            }

            var bookmarkInfo = 
                stdout
                .split("\n")
                .filter(function(line){
                    return line.indexOf("Bookmark") == 0 && 
                        (line.indexOf("Level") > 0 || line.indexOf("Title") > 0 || line.indexOf("PageNumber") > 0);
                });

           var tocInfo = { 
                          'BookmarkTitle': [],
                          'BookmarkLevel': [],
                          'BookmarkPageNumber': []
                        };
            bookmarkInfo.forEach(function(el){
               var bookmark = el.split(':');
               tocInfo[bookmark[0]].push(bookmark[1]);
            });


            var flatToc = [];
            tocInfo['BookmarkTitle'].forEach(function(el, i){
              var item = {
                  title: tocInfo.BookmarkTitle[i].trim(),
                  level: parseInt(tocInfo.BookmarkLevel[i]),
                  pageNumber: parseInt(tocInfo.BookmarkPageNumber[i])
              }
              flatToc.push(item);
           });
            
            var toc = [];
            var chapter;
            var i = 1;
            flatToc.forEach(function(item){
                if(item.level == 1){
                    chapter = {
                        title: (i++) + " " + item.title,
                        pageNumber: item.pageNumber,
                        sections: []
                    };
                    toc.push(chapter);
                } else {
                    var section = {
                        title: item.title,
                        pageNumber: item.pageNumber,
                    };
                    chapter.sections.push(section);
                }
            });
    
            console.log("pdftk - Extracted TOC! :)");
            return d.resolve(toc);
        });
        
        return d.promise;

    });
}

function join(pdfFile, files, outputFile){
    console.log("pdftk - Preparing to join toc...");
    var d = Q.defer();
    return Q().then(function(){
        var pdftkCall = generatePdftkJoinCall(pdfFile, files, outputFile);
        console.log("pdftk - Calling pdftk...")
        console.log(pdftkCall);
        exec(pdftkCall, function (error, stdout, stderr) {
            if (error) {
                console.log("pdftk - Error while joining TOC. :/");
                return d.reject(error);
            }
            console.log("pdftk - Joined TOC! :)");
            return d.resolve();
        });
        return d.promise;
    });
}

function generatePdftkJoinCall(pdfFile, files, outputFile){
    function filesRanges(files, action){
        var ranges = "";
        for(var i = 0, letter = "B".charCodeAt(0); i < files.length; i++, letter++){
            ranges += action(letter, i);
        }
        return ranges;
    }
    function onlyLetter(letter, i){
        return " " + String.fromCharCode(letter);
    }
    function letterAndFile(letter, i){
        return onlyLetter(letter, i) + "=" + files[i];
    }
    
    var pdftkCall = "pdftk A=" + pdfFile;
    pdftkCall += filesRanges(files, letterAndFile) 
    //TODO: descobrir o numero de paginas do toc original (considerando 1)
    pdftkCall +=  " cat A1";
    pdftkCall += filesRanges(files, onlyLetter) 
    pdftkCall += " A3-end output " + outputFile;
    return pdftkCall;
}

function updateBookmarkInfo(inputFile, info, infoFile, outputFile){
    console.log("pdftk - Preparing to update bookmark info...");
    var d = Q.defer();
    return Q()
        .then(function(output) {
            return Q.nfcall(fs.writeFile, infoFile, bookmarkInfo(info));
        }).then(function(){
            var pdftkCall = 'pdftk ' + inputFile + ' update_info ' + infoFile + ' output ' + outputFile;

            console.log("pdftk - Calling pdftk...")
            exec(pdftkCall, function (error, stdout, stderr) {
                if (error) {
                    console.log("pdftk - Error while updating bookmark info. :/");
                    return d.reject(error);
                }
                console.log("pdftk - Updated bookmark info! :)");
                return d.resolve();
            });
            return d.promise;
        });
}

function bookmarkInfo(info){
    var pdfInfo = "";
    
    //somando 1 para considerar a capa
    var pageNumberOffset = info.preContent.numberOfPages + 1;

    if(info.toc){
        info.toc.forEach(function(chapter){
            pdfInfo += "BookmarkBegin\n";
            pdfInfo += "BookmarkTitle: " + chapter.title + "\n";
            pdfInfo += "BookmarkLevel: 1\n";
            pdfInfo += "BookmarkPageNumber: " + (chapter.pageNumber + pageNumberOffset) + "\n";

            if(chapter.sections){
                chapter.sections.forEach(function(section){
                    pdfInfo += "BookmarkBegin\n";
                    pdfInfo += "BookmarkTitle: " + section.title + "\n";
                    pdfInfo += "BookmarkLevel: 2\n";
                    pdfInfo += "BookmarkPageNumber: " + (section.pageNumber + pageNumberOffset) + "\n";
                });
            }
        });
    }

    return pdfInfo;
}


module.exports = {
    extractNumberOfPages: extractNumberOfPages,
    extractNumberOfPagesFromFiles: extractNumberOfPagesFromFiles,
    extractTOC: extractTOC,
    join: join,
    updateBookmarkInfo: updateBookmarkInfo,
    bookmarkInfo: bookmarkInfo,
    generatePdftkJoinCall: generatePdftkJoinCall
};

/*

References:
    https://www.pdflabs.com/docs/pdftk-man-page/
    https://www.pdflabs.com/docs/pdftk-cli-examples/

*/