var path = require("path");
var fs = require("fs");

var cheerio = require("cheerio");
var kramed = require("kramed");

var util = require("./../util.js");

var CHAPTER_HEADER_TITLE = "Capítulo ";
var CAPTION_PREFIX = "Figura ";
var TOC_TITLE = "Sumário";

var WIDTH_REGEX = /\{w=(\d+)%?\}$/;

var DESKTOP_WIDTH = 1000;

var parts = {};

module.exports = {
    "handlePageBefore": handlePageBefore,
    "handlePage": handlePage,
    "handlePageAfter": handlePageAfter,
    "handleEbookBefore": handleEbookBefore
};

function handlePageBefore(page) {
    var maxLength = this.options.maxLineLength || 80;
    var filename = page.path == "README.md" ? this.options.firstChapter+".md" : page.path;
    var dentroDeCode = false;

    //nao foi utilizada regex para manter numero de linha (i)
    page.content.split("\n").forEach(function(line, i){
        if(!dentroDeCode && line.trim().indexOf("```") == 0) {
            dentroDeCode = true; //comecando um novo code
            if(line.trim() != "```" && line.trim().lastIndexOf("```") == line.trim().length - 3) {
                dentroDeCode = false; //code de uma linha só
            }
        } else if(dentroDeCode && line.trim().indexOf("```") == 0) {
            dentroDeCode = false; //terminando um code anterior
        }

        if(dentroDeCode && line.length > maxLength){
            console.log('warning: code "'+line.trim().substring(0, 30) + '"... too long. was ' + line.length + ' (max ' + maxLength + ') in ' + filename+':'+(i+1));
        }
    });
    return page;
}

function handlePage(page) {
    var options = this.options;

    var chapter = page.progress.current;
    verifyChapterTitle(chapter);

    page.sections.forEach(function (section) {
        if (section.type === "normal") {
            var $ = cheerio.load(section.content);
            addSectionNumbers($, chapter, section, options);
            adjustImages($, chapter, section, options);
            removeComments($, section);
        }
    });

    return page;
}

function handlePageAfter(page) {
    var options = this.options;
    var extension = util.obtainExtension(options);

    renderIntro(options);

    var chapter = page.progress.current;

    var chapterPath = chapter.path == "README.md" ? options.firstChapter+".md" : chapter.path;
    var chapterDir = path.dirname(chapterPath);
    if(chapterDir.indexOf("part-") == 0){
        var partHeaderPath = options.partHeaders.filter(function(partHeader){
            return path.dirname(partHeader) == chapterDir;
        })[0];

        if(partHeaderPath && !parts[partHeaderPath]) {
            parts[partHeaderPath] = true;

            var partHeaderFile = path.join(options.input, partHeaderPath);
            var partHeaderMd = fs.readFileSync(partHeaderFile);
            var partHeaderHtml = kramed(partHeaderMd.toString());

            var $ = cheerio.load(partHeaderHtml);
            var img = $("img");
            if(chapter.path == "README.md"){
                var imgSrc = img.attr("src");
                imgSrc = imgSrc.replace(/^\.\.\//, "");
                img.attr("src", imgSrc);
            }
            adjustImageWidth(img, extension);
            partHeaderHtml = $.html();

            var partHeader = '<div class="part-header">\n' + partHeaderHtml + '</div>\n';
            var $ = cheerio.load(page.content);
            $(".page").prepend(partHeader);
            page.content = $.html();
        }
    }

    if(isIntroFile(chapter, options)){
       return page;
    }

    //inserindo numero do capitulo
    //tem que fazer no page:after
    //pq o h1 com titulo do capitulo
    //é colocado depois do hook de page
    var $ = cheerio.load(page.content);
    var chapterHeader =
        $("<div>")
        .addClass("chapterHeader")
        .text(CHAPTER_HEADER_TITLE + obtainChapterNumber(chapter, options));
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
        mdFiles.forEach(function(mdFile){
                var mdData = fs.readFileSync(mdFile);
                var htmlSnippet = kramed(mdData.toString());
                options.intro.push({content: htmlSnippet});
        });
}


function verifyChapterTitle(chapter){
    var chapterTitle = chapter.title;
    if(/^[0-9]/.test(chapterTitle)){
        throw new Error("Chapter can't begin with numbers: " + chapterTitle);
    }
}

function obtainChapterNumber(chapter, options) {
    //obtem numero do capitulo a partir de info do gitbook
    var chapterLevel = Number(chapter.level);
    var numIntroChapters = Number(options.numIntroChapters);
    return chapterLevel - numIntroChapters + 1;
}

function addSectionNumbers($, chapter, section, options) {

    if(isIntroFile(chapter, options)){
       return;
    }

    var summary = options.summary;
    var firstChapter = options.firstChapter;

    var chapterNumber = obtainChapterNumber(chapter, options);
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

function adjustImages($, chapter, section, options) {
    var extension = util.obtainExtension(options);
    var chapterNumber = obtainChapterNumber(chapter, options);
    $("img").each(function (i) {
        var img = $(this);
        adjustImageWidth(img, extension);
        insertImageCaption($, img, i, chapterNumber);
    });

    section.content = $.html();
}

function adjustImageWidth(img, extension){
    //ajusta width da imagem
    var text = img.attr("alt").trim();
    var regexMatch = text.match(WIDTH_REGEX);
    if (regexMatch && regexMatch[1]) {
        text = text.replace(WIDTH_REGEX, "");
        var width = regexMatch[1];
        if(extension == "pdf") {
            img.css("width", width + "%");
        } else {
            var maxWidth = parseInt(width)/100 * DESKTOP_WIDTH;
            img.css("max-width", maxWidth + "px");
        }
        img.attr("alt", text);
    }
}

function insertImageCaption($, img, i, chapterNumber){
    //insere div com caption
    var text = img.attr("alt").trim();
    var parent = img.parent();
    img.remove();
    var figure = $("<div class='figure'>").append(img);
    parent.after(figure);
    if(text.length > 0){
        var caption = $("<p class='figcaption'>");
        caption.text(CAPTION_PREFIX + chapterNumber + "." + (i + 1) + ": " + text);
        figure.append(caption);
    }
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

function isIntroFile(chapter, options){
    //para epub e mobi, .md da intro sao colocados no SUMMARY
    var extension = util.obtainExtension(options);
    var numIntroChapters = options.numIntroChapters;
    if((extension == "epub" || extension == "mobi") && numIntroChapters > 0 && (chapter.path == "README.md" || chapter.path.indexOf("intro") == 0)){
        return true;
    }
    return false;
}
