import createBrowserHistory from "history/createBrowserHistory";
import qs from "qs";
import { Cmd, Utils } from "mangojuice-core";
import { createRouteMaps, findFirstPath } from './Utils';


/**
 * Flatten routes tree and returns an object where each
 * key is a unique path name
 * @param  {Object} routesTree
 * @return {Object}
 */
const flattenRoutesTree = (routesTree, res = {}) => {
  for (const k in routesTree) {
    const cmd = routesTree[k];
    if (cmd && cmd.routeId) {
      res[`Route_${Utils.nextId()}`] = cmd;
      if (cmd.children) {
        flattenRoutesTree(cmd.children, res);
      }
    }
  }
  return res;
};

/**
 * By given routes tree create a Router logic and returns it
 * @param  {Object} routesTree
 * @return {Object}
 */
export const createLogic = (routesTree) => ({
  ...flattenRoutesTree(routesTree),
  name: "Router",

  config({ request, createHistory = createBrowserHistory } = {}) {
    const routes = createRouteMaps(this);
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
        meta.history.replace(defaultRoute.pattern + meta.history.location.search);
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
    const firstPath = findFirstPath(meta.routes, location.pathname);
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

  @Cmd.batch
  UpdateRouter(ctx, newValues) {
    return this.DoUpdateRouter(newValues);
  },

  @Cmd.update
  DoUpdateRouter(ctx, newValues) {
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
});
