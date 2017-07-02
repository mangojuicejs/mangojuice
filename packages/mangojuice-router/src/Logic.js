import createHistory from "history/createBrowserHistory";
import qs from "qs";
import { Cmd } from "mangojuice-core";
import * as Utils from './Utils';


export const Logic = {
  name: "Router",

  config(ctx, routesObj, request) {
    const routes = Utils.expandRoutesToMaps(routesObj);
    const history = request ? null : createHistory();
    const routeCmds = Object.keys(routesObj).map(k => routesObj[k]);
    return {
      bindCommands: [this, ...routeCmds],
      meta: { routes, history, request }
    };
  },

  port({ exec, meta, destroy }) {
    const handleHistoryChange = location =>
      exec(this.HandleLocationChange(location));

    if (meta.history) {
      const defaultRoute = meta.routes.roots.find(
        x => x && x.routeId && x.options && x.options.default
      );
      if (defaultRoute && meta.history.location.pathname === "/") {
        meta.history.replace(defaultRoute.pattern);
      }
      const unlisten = meta.history.listen(handleHistoryChange);
      destroy.then(unlisten);
    }

    const initLocation = meta.request
      ? meta.request.location
      : meta.history.location;
    return handleHistoryChange(initLocation);
  },

  @Cmd.update
  HandleLocationChange({ model, meta }, location) {
    const firstPath = Utils.findFirstPath(meta.routes, location.pathname);
    const active = {};
    const changedRoutes = {};
    const appearedOnce = Object.assign({}, model.appearedOnce);
    if (firstPath) {
      firstPath.chain.forEach(x => {
        active[x] = true;
        changedRoutes[x] =
          (!model.active[x] && !model.changedRoutes[x]) || !meta.handledOnce;
        if (appearedOnce[x] === undefined) {
          appearedOnce[x] = true;
        } else if (appearedOnce[x] === true) {
          appearedOnce[x] = false;
        }
      });
    }

    const leftRoutes = {};
    Object.keys(model.active).forEach(k => {
      if (!active[k]) {
        leftRoutes[k] = true;
      }
    });

    meta.handledOnce = true;
    const search = location.search.replace(/^\?(.*)/, "$1");
    const params = firstPath
      ? { ...model.params, ...firstPath.params }
      : model.params;

    return {
      query: qs.parse(search),
      params,
      active,
      leftRoutes,
      changedRoutes,
      appearedOnce
    };
  },

  @Cmd.update
  Query({ model, meta }, query = {}, { replace, keep } = {}) {
    const newQuery = keep ? { ...query, ...model.query } : query;
    const location = meta.history.location;

    meta.history[replace ? "replace" : "push"]({
      ...location,
      search: qs.stringify(newQuery)
    });
  }
};
