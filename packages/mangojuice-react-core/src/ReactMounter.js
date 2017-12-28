import ViewWrapperCreator from './ViewWrapper';
import injectLogic from './injectLogic';


/**
 * By given react implementation object create a react mounter class
 * that should be used to mount view for a model
 * @param  {Object} reactImpl
 * @return {Class}
 */
function createReactMounter(reactImpl) {
  const ViewWrapper = ViewWrapperCreator(reactImpl);
  const { createElement, unmountComponentAtNode, render } = reactImpl;

  class ReactMounter {
    constructor(containerSelector) {
      if (containerSelector) {
        this.container = document.querySelector(containerSelector);
      }
    }

    execView(proc, View, props) {
      const nest = (model, nestView, nestProps) => {
        return this.execView(model.__proc, nestView, nestProps);
      };
      const viewProps = {
        key: proc.id,
        View: injectLogic(View),
        proc, nest, props
      };
      return createElement(ViewWrapper, viewProps);
    }

    mount(proc, view) {
      this.unmount();
      const element = this.execView(proc, view);

      if (this.container) {
        this.mounted = true;
        return render(element, this.container);
      }
      return element;
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
