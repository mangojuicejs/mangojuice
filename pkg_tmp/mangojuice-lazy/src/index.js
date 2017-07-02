var loaderUtils = require("loader-utils");
var blockCounter = 0;

module.exports = function() {};
module.exports.pitch = function(remainingRequest) {
  this.cacheable && this.cacheable();
  var result;
  if (this.target === "web" && this.splitBlocks) {
    result = [
      "var createLazyBlock = require('@mangojuice/core/lazy/createLazyBlock').default;",
      "var blockRequire = require(",
      loaderUtils.stringifyRequest(
        this,
        "!!bundle-loader?lazy&name=lazy-block-" +
          blockCounter +
          "!" +
          remainingRequest
      ),
      ");",
      "module.exports = createLazyBlock(blockRequire);"
    ];
    blockCounter++;
  } else {
    result = [
      "module.exports = require(",
      loaderUtils.stringifyRequest(this, "!!" + remainingRequest),
      ");"
    ];
  }
  return result.join("");
};
