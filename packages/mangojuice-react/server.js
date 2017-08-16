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
var Mounter = ReactMounterCore.ReactMounter(reactImpl);
var createElement = ReactMounterCore.createElementWrapper(reactImpl);

// Export react with createElement overrided
const toExport = Object.assign({}, React);
toExport.Mounter = Mounter;
toExport.createElement = createElement;
module.exports = toExport
module.exports.default = toExport;
