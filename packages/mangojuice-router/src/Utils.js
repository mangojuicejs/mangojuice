import UrlPattern from "url-pattern";
import qs from 'qs';
import { utils, logicOf } from "mangojuice-core";


/**
 * Returns list of values of given object or empty array
 * @param  {?Object} obj
 * @return {Array}
 */
export const objectValues = (obj) => {
  return obj ? Object.keys(obj).map(k => obj[k]) : [];
};

/**
 * By given router model and command object creates
 * a href value that can be used to set in `href` of
 * a link or to push/replace in history
 * @param  {object} model
 * @param  {object} cmd
 * @return {string}
 */
export function createHref(model, meta, route) {
  const { routes, history } = meta;
  let { routeId, params, query, options = {} } = route;

  // Get routes chain
  let routesChain = [];
  let currRouteId = routeId;
  if (routeId >= 0) {
    routesChain.push(routes.map[routeId]);
    while (routes.parents[currRouteId]) {
      currRouteId = routes.parents[currRouteId];
      routesChain.unshift(routes.map[currRouteId]);
    }
  }

  // Calculate next pathname
  let nextPathname = history.location.pathname;
  if (routeId >= 0) {
    const nextParams = { ...model.params, ...params };
    nextPathname = routesChain
      .reduce((acc, matcher) => acc + matcher.stringify(nextParams), "")
      .replace(/\/{2,}/g, "/") || "/"
  }

  // Calculate next query str
  const nextQuery = options.keep ? { ...model.query, ...query } : query;
  const queryStr = qs.stringify(nextQuery);
  const nextQueryStr = queryStr ? `?${queryStr}` : '';

  return nextPathname + nextQueryStr;
}

/**
 * Helper function to create an object with href and onClick handler
 * that can be used for passing to <a> elemt in react-like view
 * libraries
 * @param  {object} model
 * @param  {object} cmd
 * @return {object}
 */
export function link(model, route) {
  const logic = logicOf(model);
  return {
    onClick: logic.Push(route),
    href: createHref(model, logic.meta, route)
  };
}

/**
 * Creates a command creator for given pattern and children,
 * and extend it to be a "route" command – defines some additional
 * field in command creator, such as `routeId`
 * @param  {string} pattern
 * @param  {?object} children
 * @param  {?object} options
 * @return {RouteCreator}
 */
export const route = (pattern, children, config) => {
  const routeId = utils.nextId();
  const routeFactory = (params, query, options) => ({
    routeId,
    query,
    params,
    pattern,
    options,
    config,
    children
  });
  routeFactory.routeId = routeId;
  return routeFactory;
};

// Special route for changing only query params
export const Query = (query, keep = true) => ({
  routeId: -1,
  query: query || {},
  options: { keep }
});

/**
 * Flatten routes tree and returns an array with all the
 * routes from the tree
 * @param  {Object} routesTree
 * @return {Object}
 */
const flattenRoutesTree = (routesTree, res = []) => {
  for (const k in routesTree) {
    const cmd = routesTree[k];
    if (cmd && cmd.routeId) {
      const route = cmd();
      res.push(route);
      if (route.children) {
        flattenRoutesTree(route.children, res);
      }
    }
  }
  return res;
}

/**
 * By given list of commands create a set of maps with only
 * route commands. Returned maps represents a tree structure
 * of routes.
 * @param  {Array} commands
 * @return {Object}
 */
export const createRouteMaps = (routesTree) => {
  const map = {};
  const children = {};
  const parents = {};
  const usedNames = {};

  // Helper to track uniqueness of names in patterns
  const checkNamesUniq = names => {
    names.forEach(n => {
      if (n !== "_" && usedNames[n]) {
        throw new Error(`Param name "${n}" already used by some route`);
      } else {
        usedNames[n] = true;
      }
    });
  };

  // Create map, children and parents from routes
  const routes = flattenRoutesTree(routesTree)
    .filter(cmd => cmd && cmd.routeId);

  routes.forEach(r => {
    const suffix = r.children ? "(/*)" : "/";
    const normPatt = r.pattern.replace(/\/+$/, "") + suffix;
    const matcher = new UrlPattern(normPatt);
    checkNamesUniq(matcher.names);
    map[r.routeId] = matcher;

    if (r.children) {
      children[r.routeId] = objectValues(r.children);
      for (let k in r.children) {
        if (r.children[k] && r.children[k].routeId) {
          parents[r.children[k].routeId] = r.routeId;
        }
      }
    }
  });

  // Define routes tree and set it to each command
  const roots = routes.filter(r => !parents[r.routeId]);
  return { map, children, parents, roots };
};

/**
 * In given routes sub-tree (map, children, parents, roots) try to
 * match given path and create a route chain. Returns an object
 * with extracted params and routes changed if found, otherwise
 * returns null
 * @param  {Object} routesObj
 * @param  {string} routeId
 * @param  {string} path
 * @return {object}
 */
export const findPath = (routesObj, routeId, path) => {
  const normPath = `${path.replace(/\/+$/g, "")}/`;
  const exactPath = normPath === "//" ? "/" : normPath;
  const res = routesObj.map[routeId].match(exactPath);

  if (!res) {
    return null;
  } else {
    const children = routesObj.children[routeId];
    let childRoute, childRes;
    if (children) {
      for (let i = 0; i < children.length; i++) {
        const maybeChildRes = findPath(routesObj, children[i].routeId, `/${res._}`);
        if (maybeChildRes) {
          childRoute = children[i];
          childRes = maybeChildRes;
          break;
        }
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

/**
 * Find first mathing routes chain by given path and routes tree
 * @param  {Object} routesObj
 * @param  {string} path
 * @return {?object}
 */
export const findFirstPath = (routesObj, path) => {
  const roots = routesObj.roots;
  for (let i = 0; i < roots.length; i++) {
    const pathObj = findPath(routesObj, roots[i].routeId, path);
    if (pathObj) {
      return pathObj;
    }
  }
};

export const isFirstAppear = (model, route) =>
  model.appearedOnce[route.routeId];

export const isChanged = (model, route) =>
  model.changedRoutes[route.routeId];

export const isActive = (model, route) =>
  model.active[route.routeId];

export const isLeft = (model, route) =>
  model.leftRoutes[route.routeId];

export const isNotFound = (model, routesToCheck) => {
  if (!routesToCheck) {
    return Object.keys(model.active).length === 0;
  }

  for (let k in routesToCheck) {
    const route = routesToCheck[k];
    if (route && route.routeId && model.active[route.routeId]) {
      return false;
    }
  }
  return true;
}
