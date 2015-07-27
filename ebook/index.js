var path = require("path");
var fs = require("fs");

var cheerio = require("cheerio");
var kramed = require("kramed");
var swig = require("swig");

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
    var format = this.options.format;
    var extension = util.obtainExtension(this.options);

    var chapter = page.progress.current;
    verifyChapterTitle(chapter);

    var summary = this.options.summary;
    var firstChapter = this.options.firstChapter;
    page.sections.forEach(function (section) {
        if (section.type === "normal") {
            var $ = cheerio.load(section.content);
            addSectionNumbers($, chapter, firstChapter, summary, section);
            adjustImages($, chapter, section, extension);
            removeComments($, section);
        }
    });

    return page;
}

function handlePageAfter(page) {
    renderIntro(this.options);    

    //inserindo numero do capitulo
    //tem que fazer no page:after
    //pq o h1 com titulo do capitulo
    //é colocado depois do hook de page

    var format = this.options.format;
    var $ = cheerio.load(page.content);
    var chapter = page.progress.current;
    var chapterHeader =
        $("<div>")
        .addClass("chapterHeader")
        .text(CHAPTER_HEADER_TITLE + obtainChapterNumber(chapter));
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
        //só pra PDF
        options["--pdf-page-numbers"] = null;
        options["--disable-font-rescaling"] = true;
        options["--paper-size"] = null;
        options["--custom-size"] = this.options.pdf.customSize;
        options["--unit"] = "millimeter";
    }

    return options;
}

function renderIntro(options){
        if(options.intro){ //so roda uma vez
            return;
        }
        options.intro = [];

        var introDir = path.join(options.input, "intro");
        if(!fs.existsSync(introDir)){
            return;
        }

        var files = fs.readdirSync(introDir);
        var filtered = files.filter(function(file){
            return path.extname(file) === ".md";
        });
        var sortedByName = filtered.sort(function (a, b) {
            return a.localeCompare(b);
        });
        var mdFiles = sortedByName.map(function(file){
            return path.resolve(introDir, file);
        });
        var templateLocation = path.resolve(__dirname , 'templates/intro.tpl.html');
        mdFiles.forEach(function(mdFile){
                var mdData = fs.readFileSync(mdFile);
                var htmlSnippet = kramed(mdData.toString());
                var tpl = swig.compileFile(templateLocation,{autoescape: false});
                var html = tpl({ content: htmlSnippet});
                options.intro.push({content: html});
        });
}


function verifyChapterTitle(chapter){
	var chapterTitle = chapter.title;
	if(/^[0-9]/.test(chapterTitle)){
		throw new Error("Chapter can't begin with numbers: " + chapterTitle);
	}
}

function obtainChapterNumber(chapter) {
    //obtem numero do capitulo a partir de info o gitbook
    return Number(chapter.level) + 1;
}

function addSectionNumbers($, chapter, firstChapter, summary, section) {
    var chapterNumber = obtainChapterNumber(chapter);
    //obtem nome das secoes a partir dos h2
    var sections = [];
    $("h2").each(function (i) {
        var h2 = $(this);
        var sectionTitle = sectionNumber(chapterNumber, h2.text(), i);
        sections.push({title: sectionTitle, id: h2.attr("id")});
        h2.text(sectionTitle);
    });
    var summaryChapter = summary.chapters.filter(function(summaryChapter){
        return summaryChapter.path == chapter.path;
    })[0];
    summaryChapter.sections = sections;
    summaryChapter.htmlPath =  summaryChapter.path == "README.md" ? firstChapter+".html" : summaryChapter.path.replace(".md", ".html");
    section.content = $.html();
}

function sectionNumber(chapterNumber, text, i) {
    return chapterNumber + "." + (i + 1) + " " + text;
}

function adjustImages($, chapter, section, extension) {
    var chapterNumber = obtainChapterNumber(chapter);
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
		var figure = $("<div class='figure'>").append(img);
        parent.after(figure);
        if(text.trim().length > 0){
			var caption = $("<p class='figcaption'>");
            caption.text(CAPTION_PREFIX + chapterNumber + "." + (i + 1) + ": " + text.trim());
			figure.append(caption);
        }
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
