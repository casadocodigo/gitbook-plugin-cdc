# gitbook-plugin-cdc

Este é um plugin do [Gitbook](https://github.com/GitbookIO/gitbook), uma ferramenta para geração de livros.

## Instalação

### Pré-requisitos
Você vai precisar instalar:

- Node.js
	* Instalação: http://nodejs.org/download/
	* OBS: Testado na versão 0.10.35
- Gitbook 1.5.0
	* Utilizado para transformar .md em .html, gerando site ou ebooks
	* Instalação: `sudo npm install -g gitbook@1.5.0`
- PDFtk
	* Utilizado para extrair sumário e mesclar PDFs. 
	* Instalação (Ubuntu): `sudo apt-get install pdftk`
	* Instalação (Mac .pkg): https://www.pdflabs.com/tools/pdftk-server
	* OBS: Testado na versão 2.0.1
- Ghostscript
	* Utilizado para modificar página inicial de um PDF.
	* Instalação (Ubuntu): `sudo apt-get install ghostscript`
	* Instalação (Mac): `brew install ghostscript`
	* OBS: Testado na versão 9.10
- Calibre
	* Utilizado para gerar ebooks nos formatos .pdf, .mobi e .epub
	* Instalação (Ubuntu e Mac): instruções em http://calibre-ebook.com/download
		* (Ubuntu) Para instalar o Calibre você precisa ter instalado: xdg-utils, wget e python 2.6+
		* (Ubuntu) Para rodar o Calibre, você precisa ter instalado: GLIBC 2.13+ e libstdc++.so.6.0.17 (from gcc 4.7.0), qt-sdk e python3-pyqt5

### Configurando seu livro

1. Configure o `package.json` do seu livro da seguinte maneira:

	``` json
	{
	"name": "livro",
	"version": "0.0.1",
	"description": "livro",
	"private": true,
	"dependencies": {
	    "gitbook-plugin-cdc": "casadocodigo/gitbook-plugin-cdc",
	    "gitbook-plugin-cdc-tema": "casadocodigo/gitbook-plugin-cdc-tema"
	 }
	}
	```
1. Execute `npm install` para baixar este plugin e as outras dependências.
1. Configure  o arquivo `book.json` do seu livro, definindo `title`, `description`, `author` e `publisher`. Defina também em  `plugins`, o valores `cdc` e `cdc-tema`.

	``` json
	{
		"title": "Título do Livro",
		"description": "Descrição do Livro.",
		"author": "Fulano Silva & Ciclano Souza",
		"publisher": "Minha Editora",
		"plugins": ["cdc", "cdc-tema"]
	}
	```
	Outras opções possíves estão definidas [abaixo](#mais-opções).
1. Fizemos um [_patch_](https://raw.githubusercontent.com/alexandreaquiles/gitbook/32c941569e547045a13bd6c2835737b1cd2a6a8c/lib/generate/ebook/index.js) para adicionar algumas funcionalidades no Gitbook que não podem ser feitas com plugins. Substitua o arquivo `/usr/local/lib/node_modules/gitbook/lib/generate/ebook/index.js`, pelo [conteúdo do patch](https://raw.githubusercontent.com/alexandreaquiles/gitbook/32c941569e547045a13bd6c2835737b1cd2a6a8c/lib/generate/ebook/index.js).

## Gerando livros
Pronto! Agora podemos gerar o nosso livro. Temos algumas opções:

* Para gerar um site no diretório `_book`:

    ```gitbook build ```

* Para gerar um arquivo `book.pdf`:
    
    ```$ gitbook pdf```

* Para gerar um arquivo `book.epub`:

    ```$ gitbook epub```

* Para gerar um arquivo `book.mobi`:

    ```$ gitbook mobi```

### Mantendo os arquivos intermediários

Para ver os arquivos intermediários, você pode utilizar os comandos abaixo.

* Para gerar um PDF, mantendo os arquivos intermediários, no diretório `book.pdf`, execute:

    ```$  gitbook build -f ebook -o book.pdf```

    O arquivo PDF final é o `index-with-toc-bookmarks-and-page-numbers.pdf`.

    O PDF também pode ser gerado com o comando `$ gitbook build -f ebook`. Serão mantidos os arquivos auxiliares no diretório `_book`.

* Para gerar um MOBI, no diretório `book.mobi`, execute:

    ```$  gitbook build -f ebook -o book.mobi```
    
    O arquivo MOBI gerado é o `index.mobi`.

* Para gerar um EPUB, no diretório `book.epub`, execute:

    ```$  gitbook build -f ebook -o book.epub```
    
    O arquivo EPUB gerado é o `index.epub`.

## Mais opções

É possível mudar os valores de algumas opções através do arquivo `book.json`.
``` js
"pdf": {
	"margin": {
		"right": 56, //Number
		"left": 56, //Number
		"top": 56, //Number
		"bottom": 56 //Number
	},
	"customSize": "210x280", //String no formato largura x altura
	"fontSize": 11 //Number
	"headerTemplate": "<p>_SECTION_</p>", //String com um template html para o cabeçalho de cada página 
	"footerTemplate": "<p>_PAGENUM_</p>" //String com um template html para o rodapé de cada página  
}
```

Os valores padrão da opções anteriores estão descritos [mais adiante](#obtainpdfoptions).

Tanto para o `headerTemplate` como para o `footerTemplate`, podem ser usadas as seguintes variáveis:
* `_PAGENUM_`, que contém o número da página atual
* `_SECTION`, que contém o nome da seção atual
* `_TITLE_`, que contém o título do livro
* `_AUTHOR_`, que contém o nome do autor

## Código

Este plugin está organizado em dois sub-módulos:
* **ebook**: manipula conteúdo do livro como nomes das seções, legenda de imagens, etc...
* **pre-content**: insere conteúdo _no início_ do livro como copyright, propagandas, apresentação dos autores, etc...

### [index.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/index.js)

Configura hooks do gitbook.

Os hooks configurados são:
* `page`: disparado logo depois ter renderizado o .md de cada página em um .html, chama a função _handlePage_ do sub-módulo _ebook_
* `page:after`: disparado depois do gitbook manipular o .html de cada página, chama a função _handlePageAfter_ do sub-módulo _ebook_
* `ebook:before`: hook customizado, criado a partir [de um patch](https://raw.githubusercontent.com/alexandreaquiles/gitbook/32c941569e547045a13bd6c2835737b1cd2a6a8c/lib/generate/ebook/index.js). É disparado logo antes da chamada do calibre para a geração do ebook. Chama a função _handleEbookBefore_ do sub-módulo _ebook_
* `finish`: disparado ao fim da geração do ebook ou site, chama a função _finish_ do sub-módulo _pre-content_

As funções acima são chamadas com código do tipo `funcao.call(this, argumento)`, para que o `this` do gitbook seja propagado para cada função.

___

### [util.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/util.js)
Contém as funções comuns:

#### obtainExtension
Função que obtém a extensão do livro a ser gerado.

Parâmetros:
* options - `Object` com as configurações do `book.json` do gitbook.

Retorno:
* uma `String` com a extensão do livro a ser gerado (pdf, mobi ou epub).

Se não houver como descobrir a extensão do livro e o formato for _ebook_, é considerado o "pdf".

Se o formato for _site_, o retorno é "", uma String vazia.

#### obtainPdfOptions
Função que retorna configurações do [ebook-convert do calibre](http://manual.calibre-ebook.com/cli/ebook-convert.html)  específicas para _pdf_.

Parâmetros:
* options - `Object` com as configurações do `book.json` do gitbook.

Retorno:
* um `Object` com opções do calibre para geração de PDF. 

Algumas das opções são fixas, não podendo ser alteradas:
* `--pdf-page-numbers`: setado para _null_, para desligar a inserção de número de páginas no pdf. Os números de página é inserido pela opção  `--pdf-footer-template`.
* `--disable-font-rescaling`: setado para _true_, fazendo com que o calibre não altere os tamanhos das fontes.
* `--paper-size`: setado para _null_, porque o tamanho do papel será definido com a opção _--custom-size_.
* `--unit`: setado para _millimeter_, define a unidade utilizada na opção _--custom-size_.

Algumas opções tem valores padrão, mas podem ser alteradas através do `book.json`.
* `--custom-size`: tamanho do pdf, em milímetros, no formato largura x altura. O padrão é "155x230".
* `--pdf-default-font-size`: tamanho de texto comum. O padrão, definido pelo Gitbook, é 12.
* `--pdf-mono-font-size`: tamanho de código. O padrão, definido pelo Gitbook, é 12.
* `--margin-left`:  define a margem esquerda do pdf em pts. O padrão, definido pelo Gitbook, é 62.
* `--margin-right`: define a margem direita do pdf em pts. O padrão, definido pelo Gitbook, é 62.
* `--margin-top`: define a margem de cima do pdf em pts. O padrão, definido pelo Gitbook, é 36.
* `--margin-bottom`: define a margem de baixo do pdf em pts. O padrão, definido pelo Gitbook, é 36.
* `--pdf-header-template`: define um template html para o cabeçalho de cada página. O valor padrão é: 
``` html
<p id='ebook-header' style='border-bottom: 1px solid black; margin-top: 36pt;'><span class='odd_page'><span>{{PUBLISHER}}</span><span style='float:right'>_SECTION_</span></span><span class='even_page'><span>_SECTION_</span><span style='float:right'>{{PUBLISHER}}</span></span><script>if(!(/^[0-9]/.test('_SECTION_'))) { document.getElementById('ebook-header').style.display='none'; }</script></p>
```
O template acima mostra o nome da editora à esquerda  e o nome da seção da página atual à direita nas páginas ímpares e o inverso nas páginas pares.

    São utilizados recursos do Calibre, como a variável `_SECTION_`, que contém a seção atual, e as classes css `odd_page` e `even_page`, que ficam visíves apenas em páginas ímpares e pares, respectivamente.
    
    O trecho `{{PUBLISHER}}` é trocado pelo valor da propriedade `publisher` no arquivo `book.json` ou _Casa do Código_, se não estiver definida.
* `--pdf-footer-template`: define um template html para o rodapé de cada página. O valor padrão é:
``` html
<p id='ebook-footer'></p><script>var footer = document.getElementById('ebook-footer'); footer.innerHTML = _PAGENUM_ - 2; if(_PAGENUM_ % 2 != 0){ footer.style.textAlign = 'right'; }</script>
```
O template acima mostra o número das páginas, alternando o alinhamento entre esqueda e direita.
    É utilizada a variável `_PAGE_NUM` do Calibre, que contém a página atual. São descontadas 2 páginas: uma para capa e outra para o sumário imcompleto gerado pelo Gitbook (que é substituído depois).


Para sobreescrever as opções anteriores, [modifique o `book.json`](#mais-opções).

___

### [ebook/index.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/ebook/index.js)

Manipula conteúdo do livro.

Dependências externas: 
* [cheerio](https://github.com/cheeriojs/cheerio), uma implementação enxuta do jQuery para Node.js.

#### handlePage
Função que manipula conteúdo da página renderizada.

Parâmetros:
* page - `Object` com as informações sobre a página que será renderizada.

Retorno:
* um `Object`com a page com conteúdo manipulado.

Se o título capítulo começar com números, será lançada uma exceção. Essa limitação tem a ver com a maneira com que é feito o cabeçalho das páginas no calibre (`pdf.headerTemplate` do `book.json`). 

O gitbook/calibre não coloca números antes das seções (p. ex.: _**1.2** Integração com tecnologias do JavaEE_). Por isso, para cada `h2` de cada seção da página, é inserido o número do capítulo seguido por um número sequencial para cada seção.

Para cada `img` da página, é extraído do `alt` configurações de largura da imagem (ex.: `{w=60%}`). Se a extensão do livro for _pdf_ e houver largura configurada, é colocado um `width` no `img`. Além disso, é inserido um `div` com um `p` que serve como legenda para a imagem.

Todos os comentários html são removidos do livro.

#### handlePageAfter
Função que manipula conteúdo da página renderizada.

Parâmetros:
* page - `Object` com as informações sobre a página que será renderizada.

Retorno:
* um `Object`com a page com conteúdo manipulado.

Antes de cada `h1` que contém o título do capítulo, é inserido um `div` com o número do capítulo (ex.: _Capítulo 1_).

#### handleEbookBefore
Função que altera opções do [ebook-convert do calibre](http://manual.calibre-ebook.com/cli/ebook-convert.html)

Parâmetros:
* options - `Object` com configurações que vão ser passadas para o calibre.

Retorno:
* um `Object`com as opções do calibre alteradas.

Essa função é chamada no hook  `ebook:before`, que não é padrão do gitbook. Esse hook foi criado a partir [de um patch](https://raw.githubusercontent.com/alexandreaquiles/gitbook/32c941569e547045a13bd6c2835737b1cd2a6a8c/lib/generate/ebook/index.js). 

É disparado logo antes da chamada do calibre para a geração do ebook.

Não é chamado na geração de _site_.

São alteradas [configurações do ebook-convert](http://manual.calibre-ebook.com/cli/ebook-convert.html) do calibre que não são inseridas pelo gitbook como:
* `--publisher`: nome da editora, obtido a partir da propriedade `publisher` do `book.json`
* `--chapter-mark`: colocado para `none`, para que não sejam colocadas quebras de página no início de cada capítulo. As quebras de página devem ser controladas por css.
* `--level2-toc`: configura a detecção de seções para considerar `h2`. Utilizado na geração do sumário pelo calibre.
* `--level2-toc`: setado para `null`, de maneira a desconsiderar títulos (na verdade, `h3`) na geração do sumário pelo calibre.
 
Se a extensão do livro a ser gerado for `mobi`, são configuradas as seguintes opções:
* `--mobi-keep-original-images`: setada para `true`, fazendo com que o calibre não comprima as imagens
* `--toc-title`: modificado para _Sumário_

Se a extensão do livro a ser gerado for `pdf`, são configuradas as opções obtidas a partir da função _obtainPdfOptions_ do _util.js_. Veja acima.


___

### [pre-content/index.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/index.js)

Insere conteúdo no início do livro.

Dependências externas: 
* [fs-extra](https://github.com/jprichardson/node-fs-extra), métodos extras para o módulo de sistemas de arquivo do Node.js.
* [Q](https://github.com/kriskowal/q), biblioteca de promises para Node.js.

#### finish

Função associada ao hook de `finish` do gitbook, que é chamada no fim da geração de um site ou ebook pelo gitbook.

Se a extensão do livro a ser gerado não for pdf, não faz nada.

Agora, se for pdf, faz os seguintes passos:

1. **cria sumário** utilizando a função `renderTocPDF`
1. **adiciona conteúdo antes do sumário** através da função `handlePreContent`
1. **junta conteúdos em um pdf só** utilizando a função `join` do módulo `pdftk`, gerando o arquivo `index-with-pre-content.pdf`
1. **atualiza indíce** do pdf usando a função `updateBookmarkInfo` do módulo `pdftk`, gerando o arquivo `index-with-pre-content-and-bookmarks.pdf`
1. **atualiza informações de número das páginas** do pdf com a função `updatePageNumberInfo` do módulo `gs`, gerando o arquivo `index-with-pre-content-bookmarks-and-page-numbers.pdf`
1. há um passo final, se o comando executado for `gitbook pdf`. Os arquivos intermediários são gerados no diretório `/tmp` e logo em seguida apagados. Por isso, copiamos o `/tmp/index-with-pre-content-bookmarks-and-page-numbers.pdf` para `/tmp/index.pdf`. O gitbook se encarrega de transformá-lo no arquivo, chamado `book.pdf`.
 
#### renderTocPDF
Função privada de `pre-content/index.js` que é responsável por gerar um pdf com o sumário, a partir do pdf original do gitbook/calibre.

Parâmetros:
* outputDir - `String` com o caminho do diretório de saída 
* originalPDF - `String` com o caminho do pdf gerado pelo gitbook/calibre
* pdfInfo - `Object` com informações do livro como autor, editora e título, além das opções para geração do pdf (que foram obtidas da função `obtainPdfOptions` de `util.js`)

Retorno:
* `String` com o caminho do pdf gerado que contém o sumário

Os passos para gerar o pdf com o sumário são os seguintes:

1. extrair do indíce do pdf original, através do função `extractTOC` do módulo `pdftk.js`,  um `Object` com capítulos e seções com suas respectivas páginas.
2. atualizar as páginas do `Object` obtida no passo anterior, utilizando a função `update` do módulo `toc.js`, para que o primeiro capítulo comece na página 1. Nas informações extraídas pelo _pdftk_, o primeiro capítulo começa na página 3, porque é considerada a capa e uma página com o sumário original (e incompleto) gerado pelo gitbook.
3. com o `Object` com as páginas atualizadas, é renderizado um html através da função `render` do módulo `htmlRenderer.js`. Para isso, é passado o template `book/templates/toc.tpl.html`.
4. a `String` com o html renderizado no passo anterior é salva em um arquivo
5. para gerar um pdf com o sumário é chamada a função `generate` do módulo `calibre` passando o caminho do arquivo html, o caminho onde o arquivo pdf deve ser gerado e opções para geração do pdf. As opções do calibre vem do objeto `pdfInfo`. Algumas opções são modificadas:
    * `--pdf-header-template` fica com o título fixo (_Sumário_),
    * `--chapter` fica com `/` para desligar a detecção de capítulos e
    * `--page-breaks-before` fica com `/` para desabilitar quebras de página.

No fim desses passos, temos um pdf com o sumário do livro com capítulos e seções e as respectivas páginas.

#### handlePreContent
Função privada de `pre-content/index.js` responsável por gerar pdfs com todo o conteúdo que precede o primeiro capítulo: conteúdo fixo como pdfs com copyright e propagandas, conteúdo .md que precisa ser renderizado e o pdf do sumário.

Parâmetros:
* inputDir - `String` com o caminho do diretório de entrada
* outputDir - `String` com o caminho do diretório de saída 
* tocPDF - `String` com o caminho do pdf do sumário
* pdfInfo - `Object` com informações do livro como autor, editora e título, além das opções para geração do pdf (que foram obtidas da função `obtainPdfOptions` de `util.js`)

Retorno:
* `Array` com todos os caminhos de pdfs que devem ser inseridos antes do primeiro capítulo

Os passos para gerar o pdfs são os seguintes:

1. obter todos os arquivos `.pdf` ordenados por nome do diretório apontado pela variável de ambiente `CDC_EXTRAS_DIR`, se presente
2. verificar se existe um diretório `extras` no livro e obter todos os arquivos `.pdf` desse diretório ordenados por nome
3. obter todos os arquivos `.md`, ordenados por nome, do diretório `intro`
4. renderizar os `.md`, transformado-os em `.pdf`
5. extrair a soma dos número de páginas de todos os `.pdf` encontrados no `CDC_EXTRAS_DIR`, no `extras` ou gerados a partir do `.md` de `intro`
6. atualizar o objeto `pdfInfo` com um objeto `preContent` que tem a propriedade `numberOfPages` com a soma do número de páginas obtida anteriormente

Após a execução da função, é retornado um array com os caminhos dos `.pdf` de `CDC_EXTRAS_DIR`, `extras` e `intro` (renderizados). Além disso, o objeto `pdfInfo` terá o número de páginas desses `.pdf`.

### [pre-content/pdftk.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/pdftk.js)

Contém código de invocação da ferramenta [pdftk](https://www.pdflabs.com/docs/pdftk-man-page/).

Dependências externas: 
* [Q](https://github.com/kriskowal/q), biblioteca de promises para Node.js.

#### extractTOC
Função que usa o pdftk para extrair o índice de um pdf. 

Parâmetros:
* pdfFile - `String` com o caminho de um pdf

Retorno:
* `Array` de `Object`s com informações dos capítulos (`title`, `pageNumber` e `sections`).

É executado o comando `pdftk arquivo.pdf dump_data`. 

Cada linha da resposta do comando anterior é lida, buscando a página através do `BookmarkPageNumber`, se é seção ou capítulo através do `BookmarkLevel` e o título através do `BookmarkTitle` .

Então, é retornado um `Array` que contém objetos com as informações de cada capítulo. O retorno será algo como:
``` js
[
{  title: "Capítulo 1", 
    pageNumber: 1, 
    sections: [ 
        { title: "Seção 1.1", pageNumber: 1},
        { title: "Seção 1.2", pageNumber: 3}
    ] 
}, 
{  title: "Capítulo 2", 
    pageNumber: 5, 
    sections: [ 
        { title: "Seção 2.1", pageNumber: 6}
    ] 
}
]
```

Em [`pre-content/test/integration/pdftk-test.js`](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/test/integration/pdftk-test.js), há um teste de que executa a extração do índice em um pdf de exemplo.

#### extractNumberOfPagesFromFiles
Função que retorna a soma do número de páginas dos arquivos pdf passados como parâmetro, usando o pdftk.

Parâmetros:
* files - `Array` com o caminho de arquivos pdf

Retorno:
* `Number` com a soma do número de páginas dos pdfs.

Para extrair o número de páginas, é executado o comando `pdftk arquivo.pdf dump_data` e lida a informação `NumberOfPages`.

Como o comando `pdftk` é executado várias vezes, é criado um array de _promises_ e são utilizadas as funções [`all`](https://github.com/kriskowal/q/wiki/API-Reference#promiseall) e [`spread`](https://github.com/kriskowal/q/wiki/API-Reference#promisespreadonfulfilled-onrejected) da biblioteca `Q`, para gerenciar a execução das promises.

Em [`pre-content/test/integration/pdftk-test.js`](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/test/integration/pdftk-test.js), há um teste de que executa a extração do número de páginas de pdfs de exemplo.

#### join

Função que mescla vários arquivos pdf usando o pdftk.

Parâmetros:
* pdfFile - `String` com o caminho de um pdf principal
* files - `Array` com o caminho de arquivos pdf a serem inseridos no começo do pdf princial
* outputFile - `String` com caminho do pdf de saída
 
Os arquivos pdf no array `files` são colocados logo depois da página 1 do arquivo principal (que contém a capa do livro). Depois de todos os arquivos pdf extras, é inserido o conteúdo do pdf principal. 

_Obs.: Na verdade, é retirada a página 2 do pdf principal, porque essa página contém um sumário incompleto que é gerado pelo gitbook._

É utilizada o comando `cat` do pdftk. Um exemplo de chamada é o seguinte:
```
pdftk A="input.pdf" B="copyright.pdf" C="ads.pdf" D="toc.pdf" cat A1 B C D A3-end output out.pdf
```

Em [`pre-content/test/unit/pdftk-join-test.js`](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/test/unit/pdftk-join-test.js), há um teste de unidade com exemplos.


#### updateBookmarkInfo

Função que, dado um pdf de entrada e um objeto com as páginas iniciais e títulos dos capítulos e seções, gera um pdf de saída com as informações atualizadas.

Parâmetros:
* inputFile - `String` com o caminho do pdf de entrada
* info - `Object` com informações atualizadas das páginas e títulos
* infoFile - `String` com o caminho onde deve ser gravado o arquivo com informações do novo índice no formato do pdftk
* outputFile - `String` com caminho do pdf de saída

Vamos supor que invocamos essa função com o objeto `info`, conforme a seguir:
``` js
{
    "toc":[
        {
        "title":"1 Introdu&#231;&#227;o",
        "pageNumber":3,
        "sections":[
            {
           "title":"1.1 Mantendo o hist&#243;rico do c&#243;digo",
           "pageNumber":3
            }
        ]
        }
    ],
    "preContent": { "numberOfPages": 9 }
};
```        

Se o parâmetro `infoFile` for `info.txt`, esse arquivo será gerado com o seguinte conteúdo:
```
BookmarkBegin
BookmarkTitle: 1 Introdu&#231;&#227;o
BookmarkLevel: 1
BookmarkPageNumber: 13
BookmarkBegin
BookmarkTitle: 1.1 Mantendo o hist&#243;rico do c&#243;digo
BookmarkLevel: 2
BookmarkPageNumber: 13
```

Então, é invocada a opção `update_info` do comando pdftk da seguinte maneira:
```
pdftk input.pdf update_info info.txt output output.pdf
```

Depois dessa invocação, o índice do `output.pdf` estará com as páginas atualizadas de acordo com as informações de `info`.

Em [`pre-content/test/unit/pdftk-bookmarkInfo-test.js`](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/test/unit/pdftk-bookmarkInfo-test.js), há um teste de unidade com exemplos dos parâmetros e do tipo de arquivo que é gerado.

### [pre-content/toc.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/toc.js)

Atualiza páginas do sumário.

#### update
Função que atualiza a informação do número da página dos capítulo e seções, de maneira que o primeiro capítulo comece na página 1. Para isso, são descontadas 2 páginas: 1 para a capa e outra para o sumário original do gitbook.

Parâmetros:
* toc - `Object` com informações dos capítulos (`title`, `pageNumber` e `sections`).

Retorno:
*  `Object` com número das páginas dos capítulos e seções atualizados

### [pre-content/htmlRenderer.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/htmlRenderer.js)

Renderiza um html.

Dependências externas: 
* [Q](https://github.com/kriskowal/q), biblioteca de promises para Node.js.
* [swig](https://github.com/paularmstrong/swig/), uma engine de templates para Node.js.


#### render
Função que renderiza um html utilizando a _template engine_ `swig`, dados um conteúdo e um template.

Parâmetros:
* content - `Object` com o conteúdo a ser renderizado.
* templateLocation - `String` com o caminho de um template compatível com o `swig`

Retorno:
* uma `String` que contém o html renderizado

### [pre-content/calibre.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/calibre.js)

Renderiza um pdf utilizando o comando [`ebook-convert`](http://manual.calibre-ebook.com/cli/ebook-convert.html) do calibre.

Dependências externas: 
* [Q](https://github.com/kriskowal/q), biblioteca de promises para Node.js.

#### generate
Função que gera um pdf a partir de um html, utilizando o `ebook-convert` do calibre.

Parâmetros:
* inputFilename - `String` com o caminho do html de entrada
* outputFilename - `String` com o caminho do pdf de saída
* options - `Object` com opções do `ebook-convert`

Veja exemplos das opções do `ebook-convert` em [obtainPdfOptions](#obtainpdfoptions) do módulo util.js.

É gerada um chamada do tipo:
```
ebook-convert input.html output.pdf --disable-font-rescaling --chapter="/" --page-breaks-before="/" 
```

O comando é executado através da função `exec` do módulo `child_process` do Node.js.

### [pre-content/dir.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/dir.js)

Lista os arquivos de um diretório.

Dependências externas: 
* [Q](https://github.com/kriskowal/q), biblioteca de promises para Node.js.

#### listFilesByName
Função que retorna os caminhos de todos os arquivos de uma determinada extensão de um diretório, ordenados pelo nome do arquivo.

Parâmetros:
* dir - `String` com o caminho de um diretório.
* extension - `String` com uma extensão de arquivos

Retorno:
*  `Array` com os caminhos dos arquivos da extensão, ordenados por nome.

### [pre-content/mdRenderer.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/mdRenderer.js)

Renderiza arquivos md em pdf.

Dependências externas: 
* [Q](https://github.com/kriskowal/q), biblioteca de promises para Node.js.
* [kramed](https://github.com/GitbookIO/kramed), parser de Markdown para Node.js.

#### renderPdfs
Função que renderiza uma lista de arquivos md em pdf.

Parâmetros:
* files - `Array` com caminhos de arquivos .md
* template - `String` com o caminho de um template compatível com `swig`
* pdfOptions - `Object` com opções do `ebook-convert` 

Para cada arquivo .md do parâmetro `files`, são feitos os seguintes passos:

1. renderizar um html a partir do md utilizando a biblioteca `kramed`
2. é utilizada a função [`render`](#render) do módulo `htmlRenderer.js` passando o parâmetro `template`, para melhorar o html gerado no passo anterior.
3. é criado um arquivo com o conteúdo html com o mesmo nome do md, só que com extensão `.html`
4. é utilizada a função [`generate`](#generate) do módulo `calibre.js` para gerar um pdf a partir do arquivo html. Não é utilizado um cabeçalho nem a detecção de capítulos: `--pdf-header-template` fica _null_, `--chapter` e `--page-break-before` ficam como _/_.

### [pre-content/gs.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/gs.js)

Código de chamada do [ghostscript](http://www.ghostscript.com/doc/current/Use.htm).

Dependências externas: 
* [Q](https://github.com/kriskowal/q), biblioteca de promises para Node.js.

#### updatePageNumberInfo
Função que configura o pdf para usar números romanos (i, ii, iii, iv, ...) até antes do capítulo 1 e algarismos arábicos (1, 2, 3, 4, ...) do capítulo 1 em diante.

Parâmetros:
* inputFile - `String` com o caminho do pdf de entrada
* pageInfo - `Object` com informações do livro como título, autores, editora e número de páginas de pré-conteúdo
* pageInfoFile - `String` com o caminho onde gravar o arquivo que será usado o `gs`
* outputFile - `String` com o caminho do pdf de saída


Suponha que passamos o objeto `pageInfo`, conforme abaixo:
``` js
{
    "book": {
        "title": "Git e GitHub",
        "author": "Alexandre",
        "publisher": "Casa do Código"
    },
    "preContent": { "numberOfPages": 9 }
};
```

O arquivo gerado teria o seguinte conteúdo:
```
[ /Title (Git e GitHub)
/Author (Alexandre)
/Creator (Casa do Código)
/Producer (Casa do Código)
/DOCINFO pdfmark
[/_objdef {pl} /type /dict /OBJ pdfmark
[{pl} <</Nums [ 
0 << /S /r >> 
10 << /S /D /St 1 >> 
]>> /PUT pdfmark
[{Catalog} <</PageLabels {pl}>> /PUT pdfmark
```

O conteúdo do arquivo anterior informa para o Ghostscript que da página 0 a 9 devem ser utilizados números romanos e da página 10 em diante devem ser usados algarismos arábicos.

Então, será chamado o Ghostscript de maneira parecida com:
```
gs -q -o output.pdf -sDEVICE=pdfwrite input.pdf info.txt
```

Em [`pre-content/test/unit/gs-pageInfo-test.js`](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/pre-content/test/unit/gs-pageInfo-test.js), há um teste de unidade.
