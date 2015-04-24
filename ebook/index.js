var path = require("path");

var cheerio = require("cheerio");

var util = require("./../util.js");

var CHAPTER_HEADER_TITLE = "Capítulo ";
var CAPTION_PREFIX = "Figura ";
var TOC_TITLE = "Sumário";

var WIDTH_REGEX = /\{w=(\d+)%?\}$/;

module.exports = {
    "handlePage": handlePage,
    "handlePageAfter": handlePageAfter,
    "handleEbookBefore": handleEbookBefore
};

function handlePage(page) {
	verifyChapterTitle(page);

    var format = this.options.format;
    var extension = util.obtainExtension(this.options);

    var chapterNumber = obtainChapterNumber(page);
    page.sections.forEach(function (section) {
        if (section.type === "normal") {
            var $ = cheerio.load(section.content);
            addSectionNumbers($, chapterNumber, section);
            //só ajustar imagens para ebook
            if (format === "ebook") {
                adjustImages($, chapterNumber, section, extension);
            }
            removeComments($, section);
        }
    });

    return page;
}

function handlePageAfter(page) {
    //inserindo numero do capitulo
    //tem que fazer no page:after
    //pq o h1 com titutlo do capitulo
    //é colocado depois do hook de page

    var format = this.options.format;
    var $ = cheerio.load(page.content);
    var chapterHeader =
        $("<div>")
        .addClass("chapterHeader")
        .text(CHAPTER_HEADER_TITLE + obtainChapterNumber(page));
    $("h1.book-chapter")
        .before(chapterHeader);

    page.content = $.html();

    return page;
}


function handleEbookBefore(options) {
    var extension = util.obtainExtension(this.options);

    //options["-d debug"] = true;

    options["--publisher"] = this.options.publisher;

    options["--chapter-mark"] = "none";
    options["--level2-toc"] = "//h:h2";
    options["--level3-toc"] = null;
    
    if (extension === "mobi") {
        options["--mobi-keep-original-images"] = true;
        options["--toc-title"] = TOC_TITLE;
    }

    if (extension === "pdf") {
        var pdfOptions = util.obtainPdfOptions(this.options);

        //só pra PDF
        options["--pdf-page-numbers"] = pdfOptions["--pdf-page-numbers"];
        options["--disable-font-rescaling"] = pdfOptions["--disable-font-rescaling"];
        options["--paper-size"] = pdfOptions["--paper-size"];
        options["--custom-size"] = pdfOptions["--custom-size"];
        options["--unit"] = pdfOptions["--unit"];
        options["--pdf-default-font-size"] = pdfOptions["--pdf-default-font-size"];
        options["--pdf-mono-font-size"] = pdfOptions["--pdf-mono-font-size"];
    }

    return options;
}

function verifyChapterTitle(page){
	var chapter = page.progress.current.title;
	if(/^[0-9]/.test(chapter)){
		throw new Error("Chapter can't begin with numbers: " + chapter);
	}
}

function obtainChapterNumber(page) {
    //obtem numero do capitulo a partir do nome do .md
    var chapterNumber = 1;
    var regexMatch = page.path.match(/\d+/);
    if (regexMatch && regexMatch[0]) {
        chapterNumber = Number(regexMatch[0]);
    }
    return chapterNumber;
}

function addSectionNumbers($, chapterNumber, section) {
    //obtem nome das secoes a partir dos h2
    $("h2").each(function (i) {
        var h2 = $(this);
        h2.text(sectionNumber(chapterNumber, h2.text(), i));
    });
    section.content = $.html();
}

function sectionNumber(chapterNumber, text, i) {
    return chapterNumber + "." + (i + 1) + " " + text;
}

function adjustImages($, chapterNumber, section, extension) {
    
    $("img").each(function (i) {
        var img = $(this);
        var text = img.attr("alt").trim();

        //ajusta width da imagem
        var regexMatch = text.match(WIDTH_REGEX);
        if (regexMatch && regexMatch[1]) {
            text = text.replace(WIDTH_REGEX, "");
            if (extension === "pdf") {
                //só para PDF
                var width = regexMatch[1];
                img.css("width", width + "%");
            }
        }

        //insere div com caption
        var parent = img.parent();
        img.attr("alt", text).remove();
        var caption = $("<p class='figcaption'>");
        if(text.trim().length > 0){
            caption.text(CAPTION_PREFIX + chapterNumber + "." + (i + 1) + ": " + text.trim());
        }
        var figure = $("<div class='figure'>").append(img).append(caption);
        parent.after(figure);
    });

    section.content = $.html();
}

function removeComments($, section){
    $.root()
    .contents()
    .filter(function() {
        return this.type === 'comment';
    })
    .remove();
    section.content = $.html();
}
