import React from "react";
import ReactDOM from "react-dom";
import ReactMounterCreator from "mangojuice-react-core";

const reactImpl = {
  Component: React.Component,
  createElement: React.createElement,
  unmountComponentAtNode: ReactDOM.unmountComponentAtNode,
  render: ReactDOM.render
};

export default ReactMounterCreator(reactImpl);
