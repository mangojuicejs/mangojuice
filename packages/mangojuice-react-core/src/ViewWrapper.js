import { Cmd, Utils, MODEL_UPDATED_EVENT } from "mangojuice-core";
import ViewPortCreator from "./ViewPort";
import { runInContext } from './ViewRenderContext';


export default reactImpl => {
  const ViewPort = ViewPortCreator(reactImpl);
  const { Component, createElement } = reactImpl;

  class ViewWrapper extends Component {
    execsMap = {};
    prevExecsMap = {};

    componentDidMount() {
      this.unmounted = false;
      this.props.proc.addListener(MODEL_UPDATED_EVENT, this.updateView);
    }

    componentWillUnmount() {
      this.unmounted = true;
      this.props.proc.removeListener(MODEL_UPDATED_EVENT, this.updateView);
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
          const callCmd = !Utils.is.func(cmd)
            ? Cmd.appendArgs(Utils.ensureCmdObject(cmd).clone(), args)
            : cmd(...args);
          this.props.proc.exec(callCmd);
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
      const nestProps = {
        ...props,
        model,
        shared,
        nest,
        exec: this.execCommand
      };
      nestProps.all = nestProps;
      return runInContext(View, nestProps);
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
