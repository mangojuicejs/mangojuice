import React from "react";
import ReactDOM from "react-dom";
import { ReactMounter, getContext } from "mangojuice-react-core";
import { Utils } from "mangojuice-core";

// React interface implementation
const reactImpl = {
  Component: React.Component,
  createElement: React.createElement,
  unmountComponentAtNode: ReactDOM.unmountComponentAtNode,
  render: ReactDOM.render
};

// Patching createElement fuction to support
// commands and command creators as a prop
React.createElement = function(elem, props, ...args) {
  const context = getContext();
  if (props && context) {
    Utils.fastForEach(Object.keys(props), (k) => {
      if (
        props[k] && props[k].id &&
        ((props[k].Before && props[k].After) || props[k].isCmd)
      ) {
        props[k] = context.exec(props[k]);
      }
    });
  }
  return reactImpl.createElement(elem, props, ...args);
};

export default ReactMounter(reactImpl);
