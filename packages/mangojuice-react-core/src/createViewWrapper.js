import { procOf, logicOf, utils, ensureCommand, observe } from 'mangojuice-core';
import { setContext, getContext } from './runInContext';


// Utils
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


/**
 * View wrapper component which subscribes to model changes and rerender
 * the component only when the model changed. Also it creates a context
 * with Logic and exec functions
 *
 * @param  {Object} reactImpl
 * @return {Component}
 */
export function createViewWrapper(reactImpl) {
  const { Component, createElement } = reactImpl;

  class ViewWrapper extends Component {
    execsMap = {};
    prevExecsMap = {};

    getChildContext() {
      const { model, execCommand } = this.props;
      return {
        model,
        exec: this.execCommand,
        Logic: logicOf(model)
      };
    }

    componentDidMount() {
      const { model } = this.props;
      this.unmounted = false;
      this.stopObserver = observe(model, this.updateView, { batched: true });
    }

    componentWillUnmount() {
      this.unmounted = true;
      if (this.stopObserver) {
        this.stopObserver();
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
    };

    execCommand = (cmd) => {
      const proc = procOf(this.props.model);
      const realCmd = ensureCommand(cmd);
      const cmdHash = getCmdHash(cmd);
      let procExec = this.execsMap[cmdHash] || this.prevExecsMap[cmdHash];

      if (!procExec) {
        procExec = (...args) => {
          const callCmd = realCmd.appendArgs(args);
          proc.exec(callCmd);
        };
      }

      this.execsMap[cmdHash] = procExec;
      return procExec;
    };

    render() {
      const { View, children, props, model } = this.props;
      if (!procOf(model, true)) return null;
      return createElement(View, props, children);
    }
  }
  ViewWrapper.childContextTypes = childContextTypes;
  return ViewWrapper;
};

export default createViewWrapper;
