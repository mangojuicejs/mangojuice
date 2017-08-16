import React from "react";
import ReactDOM from "react-dom";
import { ReactMounter, getContext, ViewInContext } from "mangojuice-react-core";

// React interface implementation
const reactImpl = {
  Component: React.Component,
  createElement: React.createElement,
  unmountComponentAtNode: ReactDOM.unmountComponentAtNode,
  render: ReactDOM.render
};

// Component for nesting views for the same model
const ViewInContextComp = ViewInContext(reactImpl);

// Patching createElement fuction to support
// commands and command creators as a prop
React.createElement = function(View, props, ...args) {
  const context = getContext();
  if (props && context) {
    // Convert commands to handler functions, which will
    // execute command in current context
    for (let k in props) {
      if (
        props[k] && props[k].id &&
        ((props[k].Before && props[k].After) || props[k].isCmd)
      ) {
        props[k] = context.exec(props[k]);
      }
    }

    // Nest views for current or child models
    if (props.model && props.model.__proc) {
      if (props.model.__proc.id === context.model.__proc.id) {
        props.model = context.model;
        props.shared = context.shared;
        props.exec = context.exec;
        props.nest = context.nest;
        props.all = props;

        return reactImpl.createElement(
          ViewInContextComp,
          props,
          reactImpl.createElement(View, props, ...args)
        );
      }
      return context.nest(props.model, View, props);
    }
  }
  return reactImpl.createElement(View, props, ...args);
};

export default ReactMounter(reactImpl);
