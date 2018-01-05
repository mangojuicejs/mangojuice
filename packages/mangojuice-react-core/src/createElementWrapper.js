import { procOf } from 'mangojuice-core';
import { getContext } from './runInContext';
import { injectLogic } from './injectLogic';
import createViewWrapper from './createViewWrapper';


/**
 * By given react implementation object create a wrapped version
 * of `createElement` function which check the `model` prop and
 * if defined automatically wrap the component with neccessary
 * view wrapper to observer the model. Also inject logic
 * to any component that receives `model` field.
 *
 * It also converts all command factories to actual handler
 * functions that executes a command when it will be called.
 * @param  {Object} reactImpl
 * @return {Fuction}
 */
function createElementWrapper(reactImpl) {
  // Check if already wrapped
  if (reactImpl.createElement.__wrapped) {
    return reactImpl.createElement;
  }

  // Vew wrapper component
  const ViewWrapper = createViewWrapper(reactImpl);

  // Patching createElement fuction to support
  // commands and command creators as a prop
  const wrappedCreateElement = function(View, props, ...args) {
    const context = getContext();
    let ActualView = View;

    if (props) {
      // Convert commands to handler functions, which will
      // execute command in current context
      if (context) {
        for (let k in props) {
          const cmd = props[k];
          if (cmd && cmd.id && cmd.func) {
            props[k] = context.exec(cmd);
          }
        }
      }

      // Nest views for current or child models
      if (props.model) {
        const modelProc = procOf(props.model, true);
        const contextProc = procOf(context && context.model, true);
        ActualView = modelProc ? injectLogic(View) : View;

        if (modelProc && (!contextProc || contextProc.id !== modelProc.id)) {
          return reactImpl.createElement(ViewWrapper, {
            key: modelProc.id,
            View: ActualView,
            model: props.model,
            props
          });
        }
      }
    }
    return reactImpl.createElement(ActualView, props, ...args);
  };

  wrappedCreateElement.__wrapped = true;
  return wrappedCreateElement;
};


export default createElementWrapper;
