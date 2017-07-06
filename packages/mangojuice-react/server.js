var React = require("react");
var ReactDOMServer = require("react-dom/server");
var ReactMounterCreator = require("mangojuice-react-core");

var reactImpl = {
  Component: React.Component,
  createElement: React.createElement,
  unmountComponentAtNode: function() {},
  render: function(elem) {
    return ReactDOMServer.renderToString(elem);
  }
};

module.exports = ReactMounterCreator(reactImpl);
module.exports.default = module.exports;
