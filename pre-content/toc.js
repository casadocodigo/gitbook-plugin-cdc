function update(toc){
    //Atualiza numero de paginas do toc, 
    //para o primeiro capitulo comecar na pagina 1
    
    var updatedToc = [];
    //TODO: descobrir quantas paginas tem o TOC no PDF original 
    var pageNumberOffset = 2; //descontando 1 pagina para a capa + uma pagina para o toc original
    toc.forEach(function(chapter){
        var updatedChapter = { 
            title: chapter.title,
            pageNumber: chapter.pageNumber - pageNumberOffset, 
        };
        var updatedSections = [];
        chapter.sections.forEach(function(section){
            var updatedSection = { 
                title: section.title,
                pageNumber: section.pageNumber - pageNumberOffset,
            };
            updatedSections.push(updatedSection);
        });
        updatedChapter.sections = updatedSections;
        updatedToc.push(updatedChapter);
    });
    return updatedToc;
}

module.exports = {
    update: update
};