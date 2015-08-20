function update(toc){
    //Atualiza numero de paginas do toc, 
    //para o primeiro capitulo comecar na pagina 1
    
    //O toc original, gerado pelo gitbook/calibre, tem sempre apenas uma pagina.
    //isso é garantido pq o conteudo do toc original nao é visivel (display:none).

    var updatedToc = [];
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