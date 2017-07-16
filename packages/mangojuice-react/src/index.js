import React from "react";
import ReactDOM from "react-dom";
import { ReactMounter, getContext, runInContext } from "mangojuice-react-core";

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
    if (props.model && props.model.__proc) {
      if (props.model.__proc.id === context.model.__proc.id) {
        return runInContext(elem, { ...props, ...context });
      }
      return context.nest(props.model, elem, props);
    }
    for (let k in props) {
      if (
        props[k] && props[k].id &&
        ((props[k].Before && props[k].After) || props[k].isCmd)
      ) {
        props[k] = context.exec(props[k]);
      }
    }
  }
  return reactImpl.createElement(elem, props, ...args);
};

export default ReactMounter(reactImpl);
