var renderHooks = require('./renderHooks');
var preContent = require('./pre-content');

/*
Hooks do Gitbook disponíveis, chamados nessa ordem:
  1. init
  2. summary:before
    @param summary
    @return summary
  3. summary:after
    @param summary
    @return summary
  4. glossary:before
    @param glossary
    @return glossary
  5. glossary:after
    @param glossary
    @return glossary
  6. page:before
    @param page
    @return page
  7. page
    @param page
    @return page
  8. page:after
    @param page
    @return page
  9. ebook:before
    @param options
    @return options
  10. ebook:after
  11. finish:before
  12. finish
*/

module.exports = {
  hooks: {
    'summary:after': function (summary) {
      return renderHooks.handleSummaryAfter.call(this, summary);
    },
    'page:before': function (page) {
      return renderHooks.handlePageBefore.call(this, page);
    },
    'page': function (page) {
      return renderHooks.handlePage.call(this, page);
    },
    'page:after': function (page) {
      return renderHooks.handlePageAfter.call(this, page);
    },
    'ebook:before': function (options) {
      return renderHooks.handleEbookBefore.call(this, options);
    },
    'finish': function () {
      return preContent.addPreContent.call(this);
    }
  }
};