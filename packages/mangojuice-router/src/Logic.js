import createHistory from "history/createBrowserHistory";
import UrlPattern from "url-pattern";
import qs from "qs";
import { Utils, Cmd } from "mangojuice-core";

// Utils
export function changeToRoute(
  routeId,
  { meta, model },
  newParams,
  query,
  options = {}
) {
  const routesChain = [meta.routes.map[routeId]];
  let currRouteId = routeId;
  while (meta.routes.parents[currRouteId]) {
    currRouteId = meta.routes.parents[currRouteId];
    routesChain.unshift(meta.routes.map[currRouteId]);
  }

  const nextParams = Object.assign({}, model.params, newParams);
  const nextUrl = routesChain.reduce((acc, routeMatcher) => {
    return acc + routeMatcher.stringify(nextParams);
  }, "");

  meta.history.push(nextUrl.replace(/\/{2,}/g, "/"));
}

export const getRoutesFromObject = obj => {
  return !obj
    ? []
    : Object.keys(obj).filter(k => obj[k] && obj[k].routeId).map(k => obj[k]);
};

export const route = (pattern, children, options = {}) => {
  const routeId = Utils.nextId();
  const func = changeToRoute.bind(null, routeId);
  const routeCmd = Cmd.createUpdateCmd(pattern, func);
  routeCmd.routeId = routeId;
  routeCmd.pattern = pattern;
  routeCmd.options = options;
  routeCmd.children = children;
  return routeCmd;
};

export const expandRoutesToMaps = routes => {
  const map = {};
  const children = {};
  const parents = {};
  const usedNames = {};

  const checkNamesUniq = names => {
    names.forEach(n => {
      if (n !== "_" && usedNames[n]) {
        throw new Error(`Param name "${n}" already used by some route`);
      } else {
        usedNames[n] = true;
      }
    });
  };

  const fillObjects = (routesObj, parentId) => {
    if (!routesObj) {
      return [];
    }
    return getRoutesFromObject(routesObj).map(r => {
      const suffix = r.children ? "(/*)" : "/";
      const normPatt = r.pattern.replace(/\/+$/, "") + suffix;
      const matcher = new UrlPattern(normPatt);
      checkNamesUniq(matcher.names);
      map[r.routeId] = matcher;
      children[r.routeId] = fillObjects(r.children, r.routeId);
      parents[r.routeId] = parentId;
      return r.routeId;
    });
  };

  if (!routes.Routes) {
    throw new Error(
      "Routes module do not export `Routes` object with root routes"
    );
  }

  fillObjects(routes.Routes);
  const roots = getRoutesFromObject(routes.Routes);
  return { map, children, parents, roots };
};

export const findPath = (routesObj, routeId, path) => {
  const normPath = `${path.replace(/\/+$/g, "")}/`;
  const exactPath = normPath === "//" ? "/" : normPath;
  const res = routesObj.map[routeId].match(exactPath);
  if (!res) {
    return null;
  } else {
    const children = routesObj.children[routeId];
    let childRoute, childRes;
    for (let i = 0; i < children.length; i++) {
      const maybeChildRes = findPath(routesObj, children[i], `/${res._}`);
      if (maybeChildRes) {
        childRoute = children[i];
        childRes = maybeChildRes;
        break;
      }
    }
    if (!childRoute) {
      return {
        params: res,
        chain: [routeId]
      };
    } else {
      return {
        params: Object.assign({}, childRes.params, res, { _: undefined }),
        chain: [routeId, ...childRes.chain]
      };
    }
  }
};

export const findFirstPath = (routesObj, path) => {
  const roots = routesObj.roots;
  for (let i = 0; i < roots.length; i++) {
    const pathObj = findPath(routesObj, roots[i].routeId, path);
    if (pathObj) {
      return pathObj;
    }
  }
};

export const isFirstAppear = (model, routeCmd) =>
  model.appearedOnce[routeCmd.routeId];

export const isChanged = (model, routeCmd) =>
  model.changedRoutes[routeCmd.routeId];

export const isActive = (model, routeCmd) => model.active[routeCmd.routeId];

export const isLeft = (model, routeCmd) => model.leftRoutes[routeCmd.routeId];

export const whenRoute = (model, routeCmd, fn) =>
  (isActive(model, routeCmd) && fn()) || null;

export const whenNotFound = (model, fn) =>
  (Object.keys(model.active).length === 0 && fn()) || null;

// Logic
export const Logic = {
  name: "Router",

  config(ctx, routesObj, request) {
    const routes = expandRoutesToMaps(routesObj);
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
    const firstPath = findFirstPath(meta.routes, location.pathname);
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
