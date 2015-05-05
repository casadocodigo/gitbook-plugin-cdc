var path = require("path");

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
    "--margin-bottom": "62",
    "--pdf-header-template": "<p id='ebook-header' style='border-bottom: 1px solid black; margin-top: 36pt;'><span class='odd_page'><span>{{PUBLISHER}}</span><span style='float:right'>_SECTION_</span></span><span class='even_page'><span>_SECTION_</span><span style='float:right'>{{PUBLISHER}}</span></span><script>if(!(/^[0-9]/.test('_SECTION_'))) { document.getElementById('ebook-header').style.display='none'; }</script></p>",
    "--pdf-footer-template": "<p id='ebook-footer'></p><script>var footer = document.getElementById('ebook-footer'); footer.innerHTML = _PAGENUM_ - 2; if(_PAGENUM_ % 2 != 0){ footer.style.textAlign = 'right'; }</script>"
};

function obtainExtension(options) {
	var extension = options.extension || path.extname(options.output).replace(".", "");
	if (!extension && options.format === "ebook") {
		extension = "pdf";
	}
	return extension;
}

function obtainPdfOptions(options) {
    var pdfOptions = PDF_OPTIONS;
    if (options.pdf) {
        if(options.pdf.headerTemplate){
            pdfOptions["--pdf-header-template"] = options.pdf.headerTemplate;
        } else {
            if(options.publisher) {
                pdfOptions["--pdf-header-template"] = pdfOptions["--pdf-header-template"].replace("{{PUBLISHER}}", options.publisher);
            }
        }
        if(options.pdf.footerTemplate){
            pdfOptions["--pdf-footer-template"] = options.pdf.footerTemplate;
        }
        if (options.pdf.fontSize) {
            pdfOptions["--pdf-default-font-size"] = ""+options.pdf.fontSize;
            pdfOptions["--pdf-mono-font-size"] =  ""+options.pdf.fontSize;
        }
        if (options.pdf.customSize){
            pdfOptions["--custom-size"] = ""+options.pdf.customSize;
        }
        if (options.pdf.margin) {
            if (options.pdf.margin.top) {
                pdfOptions["--margin-top"] =  ""+options.pdf.margin.top;
            }
            if (options.pdf.margin.bottom) {
                pdfOptions["--margin-bottom"] =  ""+options.pdf.margin.bottom;
            }
            if (options.pdf.margin.left) {
                pdfOptions["--margin-left"] =  ""+options.pdf.margin.left;
            }
            if (options.pdf.margin.right) {
                pdfOptions["--margin-right"] =  ""+options.pdf.margin.right;
            }
        }
    }
    return pdfOptions;
}

module.exports = {
    "obtainExtension" : obtainExtension,
    "obtainPdfOptions": obtainPdfOptions
}
