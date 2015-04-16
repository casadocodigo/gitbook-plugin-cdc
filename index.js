var theme = require("./theme");
var ebook = require("./ebook");

module.exports = {
	  ebook : theme.ebook
    , book : theme.book
    , templates: theme.templates
    , hooks: {
        "page": ebook.handlePage,
        "page:after": ebook.handlePageAfter,
        "ebook:before": ebook.handleEbookBefore
    }
}