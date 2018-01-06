import { utils } from 'mangojuice-core';
import { runInContext } from './runInContext';
import { childContextTypes } from './createViewWrapper';


/**
 * The goal of this injector is to replace render function
 * of a component to get a context and set in module level variable
 * to be able to access it from custom `createElement` that can process
 * Commands and command creators and autowrap children components with
 * ViewWrapper component.
 *
 * @param  {React.Component} View
 * @return {React.Component}
 */
export function injectLogic(View) {
  if (!View || typeof View === 'string') return View;

  // Inject to statefull compoent
  if (View.prototype && View.prototype.render) {
    if (View.__contextInjected) return View;
    View.__contextInjected = true;

    const orgRender = View.prototype.render;
    View.prototype.render = function(...args) {
      return runInContext.call(this, this.context, orgRender, args);
    };
    View.contextTypes = {
      ...View.contextTypes,
      ...childContextTypes
    };
    return View;
  }

  // Inject to stateless function
  if (utils.is.func(View)) {
    if (View.__wrapperFunc) return View.__wrapperFunc;
    if (View.__isWrapper) return View;

    const WrapperViewFunc = function(props, context) {
      return runInContext.call(this, context, View, [props, context]);
    };
    WrapperViewFunc.__isWrapper = true;
    WrapperViewFunc.contextTypes = {
      ...View.contextTypes,
      ...childContextTypes
    };
    View.__wrapperFunc = WrapperViewFunc;
    const nameDescr = { value: View.name || 'View' };
    Object.defineProperty(WrapperViewFunc, 'name', nameDescr);
    return WrapperViewFunc;
  }

  return View;
};

export default injectLogic;
