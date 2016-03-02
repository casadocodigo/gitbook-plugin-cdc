var multistamp = require("./multistamp.js");
var extractTOC = require("./extractTOC.js");
var extractNumberOfPages = require("./extractNumberOfPages.js");
var join = require("./join.js");
var updateBookmarkInfo = require("./updateBookmarkInfo.js");

/*
References:
    https://www.pdflabs.com/docs/pdftk-man-page/
    https://www.pdflabs.com/docs/pdftk-cli-examples/

*/

module.exports = {
  multistamp: multistamp,
  extractTOC: extractTOC,
  extractNumberOfPagesFromFiles: extractNumberOfPages,
  join: join,
  updateBookmarkInfo: updateBookmarkInfo
};