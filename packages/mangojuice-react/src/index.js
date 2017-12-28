import React from 'react';
import ReactDOM from 'react-dom';
import ReactBindCore, { injectLogic } from 'mangojuice-react-core';

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
const toExport = { Mounter, createElement, injectLogic };
const blacklistProps = {
  PropTypes: 1,
  createClass: 1,
  createElement: 1,
  Mounter: 1
};
for (let k in React) {
  if (!blacklistProps[k]) {
    toExport[k] = React[k];
  }
}

module.exports = toExport;
module.exports.default = toExport;
