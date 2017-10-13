import { getContext } from "./ViewRenderContext";


export default (reactImpl) => {
  // Check if already wrapped
  if (reactImpl.createElement.__wrapped) {
    return reactImpl.createElement;
  }

  // Patching createElement fuction to support
  // commands and command creators as a prop
  const wrappedCreateElement = function(View, props, ...args) {
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
          props.exec = context.exec;
          props.nest = context.nest;
          return reactImpl.createElement(View, props, ...args);
        }
        return context.nest(props.model, View, props);
      }
    }
    return reactImpl.createElement(View, props, ...args);
  };
  wrappedCreateElement.__wrapped = true;
  return wrappedCreateElement;
};
