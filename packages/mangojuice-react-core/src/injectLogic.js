import { contextInjector } from './ViewRenderContext';
import { childContextTypes } from './ViewWrapper';


/**
 * Inject currently active Logic to context of given component.
 * For class components add logic fields to `contextType` and
 * override render method. For functional components wrap the
 * compnent with another function.
 * @param  {React.Component} View
 * @return {React.Component}
 */
function injectLogic(View) {
  if (!View || typeof View === 'string') return View;

  // Inject to statefull compoent
  if (View.prototype && View.prototype.render) {
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

    const WrapperViewFunc = function(props, context) {
      return contextInjector.call(this, context, View, [props, context]);
    };
    WrapperViewFunc.__isWrapper = true;
    WrapperViewFunc.contextTypes = {
      ...View.contextTypes,
      ...childContextTypes
    };
    View.__wrapperFunc = WrapperViewFunc;
    Object.defineProperty(WrapperViewFunc, 'name', { value: `Logic(${View.name || 'View'})` });
    return WrapperViewFunc;
  }

  return View;
};

export default injectLogic;
