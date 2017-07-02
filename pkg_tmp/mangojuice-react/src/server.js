import ReactDOMServer from "react-dom/server";
import { ReactMounter } from "./";

export default class ServerReactMounter extends ReactMounter {
  mount(proc, view) {
    const element = this.execView(proc, view);
    return ReactDOMServer.renderToString(element);
  }

  unmount() {
    // do nothing
  }
}
