# gitbook-plugin-cdc
Este plugin está organizado em dois sub-módulos:
* **ebook**: manipula conteúdo do livro como nomes das seções, legenda de imagens, etc...
* **pre-content**: insere conteúdo _no início_ do livro como copyright, propagandas, apresentação dos autores, etc...



## Organização do código

### [index.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/index.js)

Configura hooks do gitbook.

Os hooks configurados são:
* `page`: disparado logo depois ter renderizado o .md de cada página em um .html, chama a função _handlePage_ do sub-módulo _ebook_
* `page:after`: disparado depois do gitbook manipular o .html de cada página, chama a função _handlePageAfter_ do sub-módulo _ebook_
* `ebook:before`: hook customizado, criado a partir [de um patch](https://raw.githubusercontent.com/alexandreaquiles/gitbook/32c941569e547045a13bd6c2835737b1cd2a6a8c/lib/generate/ebook/index.js). É disparado logo antes da chamada do calibre para a geração do ebook. Chama a função _handleEbookBefore_ do sub-módulo _ebook_
* `finish`: disparado ao fim da geração do ebook ou site, chama a função _finish_ do sub-módulo _pre-content_

As funções acima são chamadas com código do tipo `funcao.call(this, argumento)`, para que o `this` do gitbook seja propagado para cada função.

### [util.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/util.js)
Contém as funções comuns:

#### obtainExtension(options)
Parâmetros:
* options - `Object` com as configurações do `book.json` do gitbook.

Retorno:
* uma `String` com a extensão do livro a ser gerado (pdf, mobi ou epub).

Se não houver como descobrir a extensão do livro e o formato for _ebook_, é considerado o "pdf".

Se o formato for _site_, o retorno é "", uma String vazia.

#### obtainPdfOptions(options)
Parâmetros:
* options - `Object` com as configurações do `book.json` do gitbook.

Retorno:
* um `Object` com opções do calibre para geração de PDF. 

Contém [configurações do ebook-convert](http://manual.calibre-ebook.com/cli/ebook-convert.html) do calibre específicas para _pdf_.

Algumas das opções são fixas, não podendo ser alteradas:
* `--pdf-page-numbers`: setado para _null_, para desligar a inserção de número de páginas no pdf. Os números de página vem da opção _pdf.footerTemplate_ do _book.json_.
* `--disable-font-rescaling`: setado para _true_, fazendo com que o calibre não altere os tamanhos das fontes.
* `--paper-size`: setado para _null_, porque o tamanho do papel será definido com a opção _--custom-size_.
* `--unit`: setado para _millimeter_, define a unidade utilizada na opção _--custom-size_.

Algumas opções tem valores padrão, mas podem ser alteradas através do `book.json`.
* `--custom-size`: tamanho do pdf, em milímetros, no formato largura x altura. O padrão é "155x230".
* `--pdf-default-font-size`: tamanho de texto comum. O padrão é 11.
* `--pdf-mono-font-size`: tamanho de código. O padrão é 11.
* `--margin-left`:  define a margem esquerda do pdf em pts. O padrão é 62.
* `--margin-right`: define a margem direita do pdf em pts. O padrão é 62.
* `--margin-top`: define a margem de cima do pdf em pts. O padrão é 62.
* `--margin-bottom`: define a margem de baixo do pdf em pts. O padrão é 62.

Para sobreescrever as opções anteriores, modifique o `book.json` conforme a seguir:
```
"pdf": {
	"margin": {
		"right": 56, //Number
		"left": 56, //Number
		"top": 56, //Number
		"bottom": 56 //Number
	},
	"customSize": "210x280", //String no formato largura x altura
	"fontSize": 12 //Number
}
```

### [ebook/index.js](https://github.com/casadocodigo/gitbook-plugin-cdc/blob/master/ebook/index.js)

Manipula conteúdo do livro.

Dependências: [cheerio](https://github.com/cheeriojs/cheerio), uma implementação enxuta do jQuery para Node.js.

#### handlePage
Parâmetros:
* page - `Object` com as informações sobre a página que será renderizada.

Retorno:
* um `Object`com a page com conteúdo manipulado.

Se o título capítulo começar com números, será lançada uma exceção. Essa limitação tem a ver com a maneira com que é feito o cabeçalho das páginas no calibre (`pdf.headerTemplate` do `book.json`). 

O gitbook/calibre não coloca números antes das seções (p. ex.: _**1.2** Integração com tecnologias do JavaEE_). Por isso, para cada `h2` de cada seção da página, é inserido o número do capítulo seguido por um número sequencial para cada seção.

Para cada `img` da página, é extraído do `alt` configurações de largura da imagem (ex.: `{w=60%}`). Se a extensão do livro for _pdf_ e houver largura configurada, é colocado um `width` no `img`. Além disso, é inserido um `div` com um `p` que serve como legenda para a imagem.

Todos os comentários html são removidos do livro.

#### handlePageAfter
Parâmetros:
* page - `Object` com as informações sobre a página que será renderizada.

Retorno:
* um `Object`com a page com conteúdo manipulado.

Antes de cada `h1` que contém o título do capítulo, é inserido um `div` com o número do capítulo (ex.: _Capítulo 1_).

#### handleEbookBefore
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