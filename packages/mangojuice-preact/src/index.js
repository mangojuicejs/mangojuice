import Preact from 'preact';
import ReactBindCore from "mangojuice-react-core";


// React interface implementation
const reactImpl = {
  Component: Preact.Component,
  createElement: Preact.h,
  unmountComponentAtNode: () => {},
  render: Preact.render
};
const createElement = ReactBindCore.createElementWrapper(reactImpl);
reactImpl.wrappedCreateElement = createElement;
const Mounter = ReactBindCore.ReactMounter(reactImpl);

// Export react with createElement overrided
const toExport = { ...Preact, Mounter, createElement };
module.exports = toExport
module.exports.default = toExport;
