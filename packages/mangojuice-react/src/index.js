import React from 'react';
import ReactDOM from 'react-dom';
import ReactBindCore from 'mangojuice-react-core';

// React interface implementation
const reactImpl = {
  Component: React.Component,
  createElement: React.createElement,
  unmountComponentAtNode: ReactDOM.unmountComponentAtNode,
  render: ReactDOM.render
};
const createElement = ReactBindCore.createElementWrapper(reactImpl);
reactImpl.wrappedCreateElement = createElement;
const Mounter = ReactBindCore.ReactMounter(reactImpl);

// Export react with createElement overrided
const toExport = { ...React, Mounter, createElement };
module.exports = toExport;
module.exports.default = toExport;
