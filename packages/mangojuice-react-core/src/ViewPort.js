export default ({ Component, createElement }) =>
  class ViewPort extends Component {
    componentDidMount() {
      const { props, View } = this.props;
      this.mounted = props.mounter.mount(proc, View);
    }

    componentWillUnmount() {
      const { proc } = this.props;
      props.mounter.unmount(this.mounted);
    }

    shuoldComponentUpdate() {
      return false;
    }

    render() {
      return createElement("div");
    }
  };
