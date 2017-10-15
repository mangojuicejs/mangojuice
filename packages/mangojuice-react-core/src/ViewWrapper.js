import { Cmd, Utils } from "mangojuice-core";
import { setContext, getContext } from './ViewRenderContext';

export const childContextTypes = {
  model: () => null,
  nest: () => null,
  exec: () => null
};

export default reactImpl => {
  const { Component, wrappedCreateElement } = reactImpl;

  class ViewWrapper extends Component {
    execsMap = {};
    prevExecsMap = {};

    getChildContext() {
      return {
        nest: this.props.nest,
        model: this.props.proc.model,
        exec: this.execCommand
      };
    }

    componentDidMount() {
      this.unmounted = false;
      this.props.proc.addListener(Utils.MODEL_UPDATED_EVENT, this.updateView);
    }

    componentWillUnmount() {
      this.unmounted = true;
      this.props.proc.removeListener(Utils.MODEL_UPDATED_EVENT, this.updateView);
    }

    componentDidUpdate() {
      this.prevExecsMap = {};
    }

    shouldComponentUpdate() {
      return false;
    }

    updateView = () => {
      this.prevExecsMap = this.execsMap;
      this.execsMap = {};
      if (!this.unmounted) {
        this.forceUpdate();
      }
    }

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
    }

    render() {
      if (!this.props.proc.model.__proc) {
        return wrappedCreateElement("div");
      }
      const { View, children, props } = this.props;
      const actualProps = { ...props, model: this.props.proc.model };
      return wrappedCreateElement(View, actualProps, children);
    }
  }
  ViewWrapper.childContextTypes = childContextTypes;
  return ViewWrapper;
};
