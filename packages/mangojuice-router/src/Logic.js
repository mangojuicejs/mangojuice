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

  port() {
    const { exec, meta, destroy } = this;
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
  HandleLocationChange(location) {
    const firstPath = findFirstPath(this.meta.routes, location.pathname);
    const active = {};
    const changedRoutes = {};
    const appearedOnce = { ...this.model.appearedOnce };

    if (firstPath) {
      firstPath.chain.forEach(x => {
        active[x] = true;
        changedRoutes[x] =
          (!this.model.active[x] && !this.model.changedRoutes[x]) || !this.meta.handledOnce;
        if (appearedOnce[x] === undefined) {
          appearedOnce[x] = true;
        } else if (appearedOnce[x] === true) {
          appearedOnce[x] = false;
        }
      });
    }

    const leftRoutes = {};
    for (let k in this.model.active) {
      if (!active[k]) {
        leftRoutes[k] = true;
      }
    }

    this.meta.handledOnce = true;
    const search = location.search.replace(/^\?(.*)/, "$1");
    const params = firstPath
      ? { ...this.model.params, ...firstPath.params }
      : this.model.params;

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
  UpdateRouter(newValues) {
    return this.DoUpdateRouter(newValues);
  },

  @Cmd.update
  DoUpdateRouter(newValues) {
    return newValues;
  },

  @Cmd.update
  Query(query = {}, { replace, keep } = {}) {
    const newQuery = keep ? { ...query, ...this.model.query } : query;
    const location = this.meta.history.location;

    this.meta.history[replace ? "replace" : "push"]({
      ...location,
      search: qs.stringify(newQuery)
    });
  }
});
