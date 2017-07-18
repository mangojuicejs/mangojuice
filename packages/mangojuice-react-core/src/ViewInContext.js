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
      setContext(this.props);
    }

    popContext() {
      setContext(this.oldContext);
      this.oldContext = null;
    }

    render() {
      return this.props.children;
    }
  };
