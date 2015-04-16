var theme = require("./theme");
var ebook = require("./ebook");
var preContent = require("./pre-content");

module.exports = {
	  ebook : theme.ebook
    , book : theme.book
    , templates: theme.templates
    , hooks: {
        "page": function(page) {
            return ebook.handlePage.call(this, page);
        }
        , "page:after": function(page) {
            return ebook.handlePageAfter.call(this, page);
        }
        , "ebook:before": function(options) {
            return ebook.handleEbookBefore.call(this, options);
        }
        ,  "finish": function() {
            return preContent.finish.call(this);
        }
    }
}