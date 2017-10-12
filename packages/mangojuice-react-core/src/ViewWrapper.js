import { Cmd, Utils } from "mangojuice-core";
import { setContext, getContext } from './ViewRenderContext';


export default reactImpl => {
  const { Component, createElement } = reactImpl;

  class ViewWrapper extends Component {
    execsMap = {};
    prevExecsMap = {};

    constructor(props, ...args) {
      super(props, ...args);
      this.viewContext = {
        nest: props.nest,
        model: props.proc.model,
        shared: props.proc.sharedModel,
        exec: this.execCommand
      };
      this.nestProps = {
        ...this.viewContext,
        ...props.props
      };
    }

    componentWillMount() {
      this.pushContext();
    }

    componentWillUpdate() {
      this.pushContext();
    }

    componentDidMount() {
      this.popContext();
      this.unmounted = false;
      this.props.proc.addListener(Utils.MODEL_UPDATED_EVENT, this.updateView);
    }

    componentWillUnmount() {
      this.unmounted = true;
      this.props.proc.removeListener(Utils.MODEL_UPDATED_EVENT, this.updateView);
    }

    componentDidUpdate() {
      this.popContext();
      this.prevExecsMap = {};
    }

    shuoldComponentUpdate() {
      return false;
    }

    pushContext() {
      this.prevContext = getContext();
      setContext(this.viewContext);
    }

    popContext() {
      setContext(this.prevContext);
      this.prevContext = null;
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

    renderView() {
      const { View, children } = this.props;
      return createElement(View, this.nestProps, children);
    }

    render() {
      if (!this.props.proc.model.__proc) {
        return createElement("div");
      }
      return this.renderView();
    }
  }

  return ViewWrapper;
};
