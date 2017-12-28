import { getContext } from './ViewRenderContext';
import injectLogic from './injectLogic';


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
function wrapReactCreateElement(reactImpl) {
  // Check if already wrapped
  if (reactImpl.createElement.__wrapped) {
    return reactImpl.createElement;
  }

  // Patching createElement fuction to support
  // commands and command creators as a prop
  const wrappedCreateElement = function(View, props, ...args) {
    const context = getContext();
    let ActualView = View;

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
      if (props.model && props.model.__proc) {
        ActualView = injectLogic(View);
        if (context.model && props.model.__proc.id !== context.model.__proc.id) {
          return context.nest(props.model, ActualView, props);
        }
      }
    }
    return reactImpl.createElement(ActualView, props, ...args);
  };

  wrappedCreateElement.__wrapped = true;
  return wrappedCreateElement;
};


export default wrapReactCreateElement;
