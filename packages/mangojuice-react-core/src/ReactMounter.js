import { DefaultViewMounter } from "mangojuice-core";
import ViewWrapperCreator from "./ViewWrapper";

export default reactImpl => {
  const ViewWrapper = ViewWrapperCreator(reactImpl);
  const { createElement, unmountComponentAtNode, render } = reactImpl;

  class ReactMounter extends DefaultViewMounter {
    constructor(containerSelector) {
      super();
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
        mounter: this,
        View,
        proc,
        nest,
        props
      };
      return createElement(ViewWrapper, viewProps);
    }

    mount(proc, view) {
      this.unmount();
      this.mounted = true;
      const element = this.execView(proc, view);
      if (this.container) {
        return render(element, this.container);
      }
      return element;
    }

    unmount() {
      if (this.mounted) {
        this.mounted = false;
        return unmountComponentAtNode(this.container);
      }
    }
  }

  return ReactMounter;
};
