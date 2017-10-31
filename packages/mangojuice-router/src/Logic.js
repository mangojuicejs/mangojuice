import createBrowserHistory from "history/createBrowserHistory";
import qs from "qs";
import { cmd, utils } from "mangojuice-core";
import { createRouteMaps, findFirstPath, createHref } from './Utils';


/**
 * By given routes tree create a Router logic and returns it
 * @param  {Object} routesTree
 * @return {Object}
 */
class Router {
  config({ request, createHistory = createBrowserHistory, routes } = {}) {
    const routesMap = createRouteMaps(routes);
    const history = request ? null : createHistory();
    return {
      meta: { routes: routesMap, history, request }
    };
  }

  port(exec, destroyed) {
    const { meta: { history, routes, request } } = this;
    const handleHistoryChange = location =>
      exec(this.HandleLocationChange(location));

    if (history) {
      const defaultRoute = routes.roots.find(
        x => x && x.routeId && x.config && x.config.default
      );
      if (defaultRoute && history.location.pathname === "/") {
        history.replace(defaultRoute.pattern + history.location.search);
      }
      const unlisten = history.listen(handleHistoryChange);
      destroyed.then(unlisten);
    }

    const initLocation = request
      ? request.location
      : history.location;

    return handleHistoryChange(initLocation);
  }

  @cmd HandleLocationChange(location) {
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
  }

  @cmd UpdateRouter(newValues) {
    return this.DoUpdateRouter(newValues);
  }

  @cmd DoUpdateRouter(newValues) {
    return newValues;
  }

  @cmd Push(route, e) {
    e && e.preventDefault();
    return this.ChangeHistory(route, { replace: false });
  }

  @cmd Replace(route, e) {
    e && e.preventDefault();
    return this.ChangeHistory(route, { replace: true });
  }

  @cmd ChangeHistory(route, opts = {}) {
    const changeType = opts.replace ? "replace" : "push";
    const updateHistory = this.meta.history[changeType];
    const nextUrl = createHref(this.model, this.meta, route);
    updateHistory(nextUrl);
  }
}

export default Router;
