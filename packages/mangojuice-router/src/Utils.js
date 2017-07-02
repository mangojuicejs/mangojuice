import UrlPattern from "url-pattern";
import { Utils, Cmd } from "mangojuice-core";


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

export const isNotFound = (model) => Object.keys(model.active).length === 0;
