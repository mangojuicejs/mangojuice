var React = require("react");
var ReactDOMServer = require("react-dom/server");
var ReactMounterCore = require("mangojuice-react-core");

// React interface implementation
var reactImpl = {
  Component: React.Component,
  createElement: React.createElement,
  unmountComponentAtNode: function() {},
  render: function(elem) {
    return ReactDOMServer.renderToString(elem);
  }
};

// Patching createElement fuction to support
// commands and command creators as a prop
React.createElement = ReactMounterCore.createElementWrapper(reactImpl);

module.exports = ReactMounterCore.ReactMounter(reactImpl);
module.exports.default = module.exports;
