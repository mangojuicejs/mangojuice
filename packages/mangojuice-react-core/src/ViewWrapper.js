import { procOf, logicOf, utils, ensureCommand, observe } from "mangojuice-core";
import { setContext, getContext } from './ViewRenderContext';


export function getCmdHash(cmd) {
  if (utils.is.func(cmd)) {
    return `${cmd.id}`;
  } else {
    return `${cmd.id}${cmd.args.join('.')}`;
  }
}

export const childContextTypes = {
  model: () => null,
  nest: () => null,
  exec: () => null,
  Logic: () => null
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
        exec: this.execCommand,
        Logic: logicOf(this.props.proc.model),
      };
    }

    componentDidMount() {
      this.unmounted = false;
      const destroyPromise = new Promise(r => this.destroyResolve = r);
      observe(this.props.proc.model, destroyPromise, this.updateView);
    }

    componentWillUnmount() {
      this.unmounted = true;
      if (this.destroyResolve) {
        this.destroyResolve();
      }
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

    execCommand = (cmd) => {
      const realCmd = ensureCommand(cmd);
      const cmdHash = getCmdHash(cmd);
      const execViewCmd = ((...args) => {
        const callCmd = realCmd.clone().appendArgs(args);
        this.props.proc.exec(callCmd);
      });

      this.execsMap[cmdHash] = this.prevExecsMap[cmdHash] || execViewCmd;
      return this.execsMap[cmdHash];
    }

    render() {
      if (!procOf(this.props.proc.model, true)) {
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
