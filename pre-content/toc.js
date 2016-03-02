var Q = require("q");
var xml2js = require("xml2js");
var he = require("he");
var cheerio = require("cheerio");

var pdfToText = require("./../cmd/pdfToText.js");

module.exports = {
    update: update,
    findLinkPositions: findLinkPositions,
    tocItemsByPageNumber: tocItemsByPageNumber
};

function update(toc, pdfInfo){
    //Atualiza numero de paginas do toc,
    //para o primeiro capitulo comecar na pagina 1

        function chapterPrefix() {
        //quando tiver partes, nao insere numero no nivel de chapter
        if (pdfInfo.options.partHeaders && pdfInfo.options.partHeaders.length) {
            return "";
        }
        return  chapterNum++ + " ";
    }

    function sectionPrefix() {
        //quando tiver partes, insere numero no nivel de section
        if (pdfInfo.options.partHeaders && pdfInfo.options.partHeaders.length) {
            return  chapterNum++ + " ";
        }
        return "";
    }

    function updateSubSection(subSection) {
        var updatedSubSection = {
            title: subSection.title,
            pageNumber: subSection.pageNumber - pdfInfo.content.pageNumberOffset
        };
        return updatedSubSection;
    }

    function updateSection(section) {
        var updatedSection = {
            title: sectionPrefix() + section.title,
            pageNumber: section.pageNumber - pdfInfo.content.pageNumberOffset
        };
        var updatedSubSections = [];
        section.subSections.forEach(function(subSection){
            updatedSubSections.push(updateSubSection(subSection));
        });
        updatedSection.subSections = updatedSubSections;
        return updatedSection;
    }

    function updateChapter(chapter) {
        var updatedChapter = {
            title: chapterPrefix() + chapter.title,
            pageNumber: chapter.pageNumber - pdfInfo.content.pageNumberOffset
        };
        var updatedSections = [];
        chapter.sections.forEach(function(section){
            updatedSections.push(updateSection(section));
        });
        updatedChapter.sections = updatedSections;
        return updatedChapter;
    }

    var chapterNum = 1;

    var updatedToc = [];
    toc.forEach(function(chapter){
        updatedToc.push(updateChapter(chapter));
    });
    pdfInfo.toc = updatedToc;
    return updatedToc;

}

function findLinkPositions(tocPdf, pdfInfo){
    return Q()
    .then(function () {
        return pdfToText.extractTextPositions(tocPdf);
    })
    .then(positionXmlToJs)
    .then(function (positions) {
        console.log("Building pdf links...");
        var headers = headerText(pdfInfo);

        var pages = positions.html.body[0].doc[0].page;
        pages.forEach(function(page, i){
            var words = page.word;
            var pageInfo = {
                links: []
            };
            words.forEach(function(word, i){
                var positionTitle = word._.replace(/\s/g, "");
                pdfInfo.toc.forEach(function(chapter){
                    var link = getLink(words, page, word, i, chapter.title, positionTitle, headers);
                    if(link) {
                        pageInfo.links.push(link);
                    } else {
                        chapter.sections.forEach(function(section){
                            var link = getLink(words, page, word, i, section.title, positionTitle, headers);
                            if(link) {
                                pageInfo.links.push(link);
                            } else {
                                section.subSections.forEach(function(subSection){
                                    var link = getLink(words, page, word, i, subSection.title, positionTitle, headers);
                                    if(link) {
                                        pageInfo.links.push(link);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            pdfInfo.positions.pages.push(pageInfo);
        });
        console.log("Built pdf links...");
    })
    .then(function(){
        return tocPdf;
    });
}

function positionXmlToJs(xml) {
    var d = Q.defer();
    return Q().then(function(){
        xml2js.parseString(xml, function (err, result) {
            if (err) {
                console.log("Error transforming position xml to js... :/")
                return d.reject(err);
            }
            console.log("Transformed position xml to js! :)")
            return d.resolve(result);
        });
        return d.promise;
    });
}

function getLink(words, page, word, i, title, positionTitle, headers) {
    var decodedSpacelessTitle = he.decode(title.replace(/\s/g, ""));
    if(decodedSpacelessTitle == positionTitle){
        var link = {
            xMin: Number(word.$.xMin),
            xMax: Number(word.$.xMax),
            yMin: page.$.height - Number(word.$.yMin),
            yMax: page.$.height - Number(word.$.yMax)
        };
        var linkPage = findLinkPageNumber(words, i, headers);
        if(linkPage){
            link.page = linkPage;
            return link;
        }
        return;
    }
}

function findLinkPageNumber(words, i, headers){
    while (headers.indexOf(words[i]._) != -1) {
        i++;
    }
    do {
        var linkPage = Number(words[i]._);
        if(!isNaN(linkPage)){
            return linkPage;
        }
        i++;
    } while (i < words.length);
    return;
}

function headerText(pdfInfo){
    //skips header text
    var $ = cheerio.load(pdfInfo.options.pdf.summary.headerTemplate);
    var headers = {};
    $("*").each(function(){
        headers[$(this).text()] = true;
    });
    return Object.keys(headers);
}

function tocItemsByPageNumber(pdfInfo) {
    var tocItemsByPageNumber = {};

    function addTocItem(pageNumber, tocItem){
    if(!tocItemsByPageNumber[pageNumber]){
        tocItemsByPageNumber[pageNumber] = [ tocItem ] ;
    } else {
        tocItemsByPageNumber[pageNumber].push(tocItem);
    }
}

    //fazer objeto pageNum -> title
    pdfInfo.toc.forEach(function(chapter){
        var chapterTocItem = { type: 'chapter', title: he.decode(chapter.title) };
        addTocItem(chapter.pageNumber, chapterTocItem);
        chapter.sections.forEach(function(section){
            var sectionTocItem = {type: 'section', title: he.decode(section.title), chapter: chapterTocItem };
            addTocItem(section.pageNumber, sectionTocItem);
            section.subSections.forEach(function(subSection){
                var subSectionTocItem = {type: 'subSection', title: he.decode(subSection.title), section: sectionTocItem };
                addTocItem(subSection.pageNumber, subSectionTocItem);
            });
        });
    });

    //expandir pageNums
    var tocItemsByPageNumberExpanded = {};
    var previousPageNum;
    Object.keys(tocItemsByPageNumber).forEach(function(pageNumber){
        pageNumber = parseInt(pageNumber);
        if(previousPageNum && pageNumber - previousPageNum > 1){
            for(var i = previousPageNum + 1; i < pageNumber; i++) {
                tocItemsByPageNumberExpanded[i] = tocItemsByPageNumber[previousPageNum].slice(-1)[0];
            }
        }
        tocItemsByPageNumberExpanded[pageNumber] = tocItemsByPageNumber[pageNumber][0];
        previousPageNum = pageNumber;
    });
    if(pdfInfo.content.numberOfPages - previousPageNum > 0){
        for(var i = previousPageNum + 1; i <= pdfInfo.content.numberOfPages; i++) {
            tocItemsByPageNumberExpanded[i] = tocItemsByPageNumber[previousPageNum].slice(-1)[0];
        }
    }
    return tocItemsByPageNumberExpanded;
}
