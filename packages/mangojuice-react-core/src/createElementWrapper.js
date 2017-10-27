import { getContext, setContext, contextInjector } from "./ViewRenderContext";
import { childContextTypes } from './ViewWrapper';


export default (reactImpl) => {
  // Check if already wrapped
  if (reactImpl.createElement.__wrapped) {
    return reactImpl.createElement;
  }

  // Extend statefull component by adding extra lifecycle
  // methods to track context while render function
  const injectContextToStatefull = (View) => {
    if (!View || typeof View === 'string') return View;

    // Inject to statefull compoent
    if (View.prototype instanceof reactImpl.Component) {
      if (View.__contextInjected) return View;
      View.__contextInjected = true;

      const orgRender = View.prototype.render;
      View.prototype.render = function(...args) {
        return contextInjector.call(this, this.context, orgRender, args);
      };
      View.contextTypes = {
        ...View.contextTypes,
        ...childContextTypes
      };
      return View;
    }

    // Inject to stateless function
    if (typeof View === 'function') {
      if (View.__wrapperFunc) return View.__wrapperFunc;
      if (View.__isWrapper) return View;

      const WrapperViewFunc = function (props, context) {
        return contextInjector.call(this, context, View, [props, context]);
      };
      WrapperViewFunc.__isWrapper = true;
      WrapperViewFunc.contextTypes = {
        ...View.contextTypes,
        ...childContextTypes
      };
      View.__wrapperFunc = WrapperViewFunc;
      return WrapperViewFunc;
    }

    return View;
  };

  // Patching createElement fuction to support
  // commands and command creators as a prop
  const wrappedCreateElement = function(View, props, ...args) {
    const context = getContext();
    View = injectContextToStatefull(View);

    if (props && context) {
      // Convert commands to handler functions, which will
      // execute command in current context
      for (let k in props) {
        const cmd = props[k];
        if (cmd && cmd.id && cmd.func) {
          props[k] = context.exec(cmd);
        }
      }

      // Nest views for current or child models
      if (
        props.model && props.model.__proc && context.model &&
        props.model.__proc.id !== context.model.__proc.id
      ) {
        return context.nest(props.model, View, props);
      }
    }
    return reactImpl.createElement(View, props, ...args);
  };
  wrappedCreateElement.__wrapped = true;
  return wrappedCreateElement;
};
