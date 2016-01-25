var Q = require("q");
var xml2js = require("xml2js");
var he = require("he");
var cheerio = require("cheerio");

var pdfToText = require("./pdfToText.js");

module.exports = {
    update: update,
    findLinkPositions: findLinkPositions
};

function update(toc, pdfInfo){
    //Atualiza numero de paginas do toc,
    //para o primeiro capitulo comecar na pagina 1
    
    //O toc original, gerado pelo gitbook/calibre, tem sempre apenas uma pagina.
    //isso é garantido pq o conteudo do toc original nao é visivel (display:none).
    var pageNumberOffset = 2; //descontando 1 pagina para a capa + uma pagina para o toc original

    var chapterNum = 1;

    var updatedToc = [];
    toc.forEach(function(chapter){
        updatedToc.push(updateChapter(chapter));
    });
    return updatedToc;

    function chapterPrefix() {
        //quando tiver partes, nao insere numero no nivel de chapter
        if (pdfInfo.options.partHeaders.length) {
            return "";
        }
        return  chapterNum++ + " ";
    }

    function sectionPrefix() {
        //quando tiver partes, insere numero no nivel de section
        if (pdfInfo.options.partHeaders.length) {
            return  chapterNum++ + " ";
        }
        return "";
    }

    function updateChapter(chapter) {
        var updatedChapter = {
            title: chapterPrefix() + chapter.title,
            pageNumber: chapter.pageNumber - pageNumberOffset
        };
        var updatedSections = [];
        chapter.sections.forEach(function(section){
            updatedSections.push(updateSection(section));
        });
        updatedChapter.sections = updatedSections;
        return updatedChapter;
    }

    function updateSection(section) {
        var updatedSection = {
            title: sectionPrefix() + section.title,
            pageNumber: section.pageNumber - pageNumberOffset
        };
        var updatedSubSections = [];
        section.subSections.forEach(function(subSection){
            updatedSubSections.push(updateSubSection(subSection));
        });
        updatedSection.subSections = updatedSubSections;
        return updatedSection;
    }

    function updateSubSection(subSection) {
        var updatedSubSection = {
            title: subSection.title,
            pageNumber: subSection.pageNumber - pageNumberOffset
        };
        return updatedSubSection;
    }

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