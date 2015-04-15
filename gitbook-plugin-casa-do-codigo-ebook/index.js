var path = require("path");

var cheerio = require("cheerio");

var theme = require("gitbook-theme-casa-do-codigo");

var CHAPTER_HEADER_TITLE = "Capítulo ";
var CAPTION_PREFIX = "Figura ";
var TOC_TITLE = "Sumário";

var WIDTH_REGEX = /\{w=(\d+)%?\}$/;

var PDF_OPTIONS = {
    "--pdf-page-numbers": null,
    "--disable-font-rescaling": true,
    "--paper-size": null,
    "--custom-size": "155x230",
    "--unit": "millimeter",
    "--pdf-default-font-size": "11",
    "--pdf-mono-font-size": "11",
    "--margin-left": "62",
    "--margin-right": "62",
    "--margin-top": "62",
    "--margin-bottom": "62"
};

module.exports = {
	hooks: {
        "page": handlePage,
        "page:after": handlePageAfter,
         "ebook:before": handleEbookBefore
    },
    pdfOptions: PDF_OPTIONS
};


function handlePage(page) {
    var format = this.options.format;
    var extension = theme.obtainExtension(this.options);

    var chapterNumber = obtainChapterNumber(page);
    page.sections.forEach(function (section) {
        if (section.type === "normal") {
            var $ = cheerio.load(section.content);
            //só colocar numeros de secao e ajustar imagens para ebook
            if (format === "ebook") {
                addSectionNumbers($, chapterNumber, section);
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
    if (format === "ebook") {
        var $ = cheerio.load(page.content);
        var chapterHeader =
            $("<div>")
            .addClass("chapterHeader")
            .text(CHAPTER_HEADER_TITLE + obtainChapterNumber(page));
        $("h1")
            .before(chapterHeader);

        page.content = $.html();
    }
    
    return page;
}


function handleEbookBefore(options) {
    var extension = theme.obtainExtension(this.options);

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
        //só pra PDF
        options["--pdf-page-numbers"] = PDF_OPTIONS["--pdf-page-numbers"];
        options["--disable-font-rescaling"] = PDF_OPTIONS["--disable-font-rescaling"];
        options["--paper-size"] = PDF_OPTIONS["--paper-size"];
        options["--custom-size"] = PDF_OPTIONS["--custom-size"];
        options["--unit"] = PDF_OPTIONS["--unit"];
        options["--pdf-default-font-size"] = PDF_OPTIONS["--pdf-default-font-size"];
        options["--pdf-mono-font-size"] = PDF_OPTIONS["--pdf-mono-font-size"];
    }

    return options;
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
        var caption = $("<p class='figcaption'>").text(CAPTION_PREFIX + chapterNumber + "." + (i + 1) + ": " + text);
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
