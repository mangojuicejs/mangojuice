import { procOf } from 'mangojuice-core';
import createElementWrapper from './createElementWrapper';
import injectLogic from './injectLogic';


/**
 * By given react implementation object create a react mounter class
 * that should be used to mount view for a model
 * @param  {Object} reactImpl
 * @param  {Function} createElement
 * @return {Class}
 */
function createReactMounter(reactImpl) {
  const {
    render,
    unmountComponentAtNode,
    wrappedCreateElement
  } = reactImpl;

  class ReactMounter {
    constructor(containerSelector) {
      if (containerSelector) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
          throw new Error(`Given container "${containerSelector}" doesn't exist in DOM`);
        }
      }
    }

    mount(model, View) {
      this.unmount();
      const element = wrappedCreateElement(View, { model });
      if (!this.container) {
        return element;
      } else {
        this.mounted = true;
        return render(element, this.container);
      }
    }

    unmount() {
      if (this.mounted && this.container) {
        this.mounted = false;
        return unmountComponentAtNode(this.container);
      }
    }
  }

  return ReactMounter;
};


export default createReactMounter;
