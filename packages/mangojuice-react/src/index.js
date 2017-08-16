import React from "react";
import ReactDOM from "react-dom";
import { ReactMounter, createElementWrapper } from "mangojuice-react-core";


// React interface implementation
const reactImpl = {
  Component: React.Component,
  createElement: React.createElement,
  unmountComponentAtNode: ReactDOM.unmountComponentAtNode,
  render: ReactDOM.render
};
const Mounter = ReactMounter(reactImpl);
const createElement = createElementWrapper(reactImpl);

// Export react with createElement overrided
const toExport = { ...React, Mounter, createElement };
module.exports = toExport
module.exports.default = toExport;
