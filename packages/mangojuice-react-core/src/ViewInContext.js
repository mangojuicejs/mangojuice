import { setContext, getContext } from './ViewRenderContext';


export default ({ Component, createElement }) =>
  class ViewInContext extends Component {
    componentWillMount() {
      this.pushContext();
    }

    componentDidMount() {
      this.popContext();
    }

    componentWillUpdate() {
      this.pushContext();
    }

    componentDidUpdate() {
      this.popContext();
    }

    pushContext() {
      this.oldContext = getContext();
      setContext(this.props.props);
    }

    popContext() {
      this.oldContext = null;
      setContext(this.oldContext);
    }

    render() {
      return createElement(this.props.View, this.props.props);
    }
  };
