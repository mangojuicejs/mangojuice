import { Cmd, MODEL_UPDATED_EVENT } from "mangojuice-core";
import ViewPortCreator from "./ViewPort";

export default reactImpl => {
  const ViewPort = ViewPortCreator(reactImpl);
  const { Component, createElement } = reactImpl;

  class ViewWrapper extends Component {
    execsMap = {};
    prevExecsMap = {};

    componentDidMount() {
      const { proc } = this.props;
      this.unmounted = false;
      proc.addListener(MODEL_UPDATED_EVENT, this.updateView);
    }

    componentWillUnmount() {
      const { proc } = this.props;
      this.unmounted = true;
      proc.removeListener(MODEL_UPDATED_EVENT, this.updateView);
    }

    componentDidUpdate() {
      this.prevExecsMap = {};
    }

    shuoldComponentUpdate() {
      return false;
    }

    updateView = () => {
      this.prevExecsMap = this.execsMap;
      this.execsMap = {};
      if (!this.unmounted) {
        this.forceUpdate();
      }
    };

    execCommand = cmd => {
      const cmdHash = Cmd.hash(cmd);
      this.execsMap[cmdHash] =
        this.prevExecsMap[cmdHash] ||
        ((...args) => {
          this.props.proc.exec(Cmd.appendArgs(cmd.clone(), args));
        });
      return this.execsMap[cmdHash];
    };

    renderPort() {
      return createElement(ViewPort, this.props);
    }

    renderView() {
      const {
        View,
        proc: { model, sharedModel: shared },
        nest,
        props
      } = this.props;
      const nestProps = { model, shared, nest, props, exec: this.execCommand };
      nestProps.all = nestProps;
      return createElement(View, nestProps);
    }

    render() {
      if (!this.props.proc.model.__proc) {
        return createElement("div");
      }

      const parentMounter = this.props.mounter;
      const propsMounter = this.props.props && this.props.props.mounter;
      return propsMounter && propsMounter !== parentMounter
        ? this.renderPort()
        : this.renderView();
    }
  }

  return ViewWrapper;
};
