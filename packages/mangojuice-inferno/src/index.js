import Inferno from 'inferno';
import Component from 'inferno-component';
import originalCreateElement from 'inferno-create-element';
import ReactBindCore, { injectLogic } from 'mangojuice-react-core';

// React interface implementation
const reactImpl = {
  Component: Component,
  createElement: originalCreateElement,
  unmountComponentAtNode: () => {},
  render: Inferno.render
};
const createElement = ReactBindCore.createElementWrapper(reactImpl);
reactImpl.wrappedCreateElement = createElement;
const Mounter = ReactBindCore.ReactMounter(reactImpl);

// Export react with createElement overrided
const toExport = { ...Inferno, Component, createElement, Mounter, injectLogic };
module.exports = toExport;
module.exports.default = toExport;
