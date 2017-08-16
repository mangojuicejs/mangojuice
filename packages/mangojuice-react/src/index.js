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

// Patching createElement fuction to support
// commands and command creators as a prop
React.createElement = createElementWrapper(reactImpl);

export default ReactMounter(reactImpl);
