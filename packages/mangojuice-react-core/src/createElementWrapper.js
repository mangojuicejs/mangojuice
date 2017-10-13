import { getContext, setContext } from "./ViewRenderContext";


// Replace some function in prototype and call
// the original after replaced one if defined
const extendPrototypeWithSuper = (proto, name, func) => {
  const oldFunc = proto[name];
  proto[name] = function(...args) {
    func.apply(this, args);
    if (oldFunc) {
      return oldFunc.apply(this, args);
    }
  }
};

export default (reactImpl) => {
  // Check if already wrapped
  if (reactImpl.createElement.__wrapped) {
    return reactImpl.createElement;
  }

  // Extend statefull component by adding extra lifecycle
  // methods to track context while render function
  const injectContextToStatefull = (View) => {
    // Do nothing if context injected pr not statefull
    if (
      View.__contextInjected ||
      !(View.prototype instanceof reactImpl.Component)
    ) {
      return;
    }
    extendPrototypeWithSuper(View.prototype, 'componentWillMount', function() {
      this.__appContext = getContext();
    });
    extendPrototypeWithSuper(View.prototype, 'componentWillUpdate', function() {
      this.__oldContext = getContext();
      setContext(this.__appContext);
    });
    extendPrototypeWithSuper(View.prototype, 'componentDidUpdate', function() {
      setContext(this.__oldContext);
      this.__oldContext = null;
    });
    View.__contextInjected = true;
  };

  // Patching createElement fuction to support
  // commands and command creators as a prop
  const wrappedCreateElement = function(View, props, ...args) {
    const context = getContext();
    injectContextToStatefull(View);

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
