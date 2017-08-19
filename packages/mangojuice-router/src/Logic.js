import createBrowserHistory from "history/createBrowserHistory";
import qs from "qs";
import { Cmd } from "mangojuice-core";
import * as Utils from './Utils';


export const Logic = {
  name: "Router",

  config({ binded }, options = {}) {
    const { request, createHistory = createBrowserHistory } = options;
    const routes = Utils.createRouteMaps(binded);
    const history = request ? null : createHistory();
    return {
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

  @Cmd.batch
  HandleLocationChange({ model, meta }, location) {
    const firstPath = Utils.findFirstPath(meta.routes, location.pathname);
    const active = {};
    const changedRoutes = {};
    const appearedOnce = { ...model.appearedOnce };

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
    for (let k in model.active) {
      if (!active[k]) {
        leftRoutes[k] = true;
      }
    }

    meta.handledOnce = true;
    const search = location.search.replace(/^\?(.*)/, "$1");
    const params = firstPath
      ? { ...model.params, ...firstPath.params }
      : model.params;

    return this.UpdateRouter({
      query: qs.parse(search),
      params,
      active,
      leftRoutes,
      changedRoutes,
      appearedOnce
    });
  },

  @Cmd.update
  UpdateRouter(ctx, newValues) {
    return newValues;
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
