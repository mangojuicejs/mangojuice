import React from "react";
import ReactDOM from "react-dom";
import { Utils, Cmd } from "../../";

export class ViewPort extends React.Component {
  componentDidMount() {
    const { proc, View } = this.props;
    this.mounted = proc.config.mounter.mount(proc, View);
  }
  componentWillUnmount() {
    const { proc } = this.props;
    proc.config.mounter.unmount(this.mounted);
  }
  shuoldComponentUpdate() {
    return false;
  }
  render() {
    return React.createElement("div");
  }
}

export class ViewWrapper extends React.Component {
  execsMap = {};
  prevExecsMap = {};

  componentDidMount() {
    const { proc } = this.props;
    this.unmounted = false;
    proc.on("updated", this.updateView);
  }
  componentWillUnmount() {
    const { proc } = this.props;
    this.unmounted = true;
    proc.removeListener("updated", this.updateView);
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
    return React.createElement(ViewPort, this.props);
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
    return React.createElement(View, nestProps);
  }
  render() {
    const parentMounter = this.props.mounter;
    const logicMounter = this.props.proc.config.mounter;
    return logicMounter && logicMounter !== parentMounter
      ? this.renderPort()
      : this.renderView();
  }
}

export class ReactMounter {
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
      mounter: this,
      View,
      proc,
      nest,
      props
    };
    return React.createElement(ViewWrapper, viewProps);
  }

  mount(proc, view) {
    this.unmount();
    this.mounted = true;
    const element = this.execView(proc, view);
    return ReactDOM.render(element, this.container);
  }

  unmount() {
    if (this.mounted) {
      this.mounted = false;
      return ReactDOM.unmountComponentAtNode(this.container);
    }
  }
}

export default ReactMounter;
