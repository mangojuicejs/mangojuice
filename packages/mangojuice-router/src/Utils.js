import UrlPattern from "url-pattern";
import { Utils, Cmd } from "mangojuice-core";


/**
 * By given router model and command object creates
 * a href value that can be used to set in `href` of
 * a link or to push/replace in history
 * @param  {object} model
 * @param  {object} cmd
 * @return {string}
 */
export function createHref(model, { routes, routeId, args }) {
  const [ newParams, newQuery, opts = {} ] = args;

  // Get routes chain
  const routesChain = [routes.map[routeId]];
  let currRouteId = routeId;
  while (routes.parents[currRouteId]) {
    currRouteId = routes.parents[currRouteId];
    routesChain.unshift(routes.map[currRouteId]);
  }

  // Calculate next URL
  const nextQuery = opts.keep ? { ...newQuery, ...model.query } : newQuery;
  const nextParams = { ...model.params, ...newParams };
  const nextUrl = routesChain
    .reduce((acc, matcher) => acc + matcher.stringify(nextParams), "")
    .replace(/\/{2,}/g, "/") + qs.stringify(nextQuery);

  return nextUrl;
}

/**
 * Helper function to create an object with href and onClick handler
 * that can be used for passing to <a> elemt in react-like view
 * libraries
 * @param  {object} model
 * @param  {object} cmd
 * @return {object}
 */
export function link(model, cmd) {
  return {
    onClick: cmd,
    href: createHref(model, cmd)
  };
}

/**
 * Route command function, which change the browser's
 * history by binded routeId and provided arguments.
 * @param  {string} routeId
 * @param  {object} options.meta
 * @param  {object} options.model
 * @param  {object} newParams
 * @param  {object} query
 * @param  {object} options
 */
export function routeUpdateCommand(routeId, { model, meta }, ...args) {
  // Stop handling a click to a link by the browser
  const event = args[args.length - 1];
  if (event && event.preventDefault) {
    args.pop();
    event.preventDefault();
  }

  // Calculate next url to push to history
  const updateHistory = meta.history[replace ? "replace" : "push"];
  const nextUrl = createHref(model, { routeId, args, routes: meta.routes });
  updateHistory(nextUrl);
}

/**
 * Creates a command creator for given pattern and children,
 * and extend it to be a "route" command – defines some additional
 * field in command creator, such as `routeId`
 * @param  {string} pattern
 * @param  {?object} children
 * @param  {?object} options
 * @return {CommandCreator}
 */
export const route = (pattern, children, options = {}) => {
  const routeId = Utils.nextId();
  const func = routeUpdateCommand.bind(null, routeId);
  const routeCmd = Cmd.createUpdateCmd(pattern, func);
  routeCmd.routeId = routeId;
  routeCmd.pattern = pattern;
  routeCmd.options = options;
  routeCmd.children = children;
  return routeCmd;
};

/**
 * By given list of commands create a set of maps with only
 * route commands. Returned maps represents a tree structure
 * of routes.
 * @param  {Array} commands
 * @return {Object}
 */
export const createRouteMaps = (commands) => {
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
  const routes = commands.filter(cmd => cmd && cmd.routeId);
  routes.forEach(r => {
    const suffix = r.children ? "(/*)" : "/";
    const normPatt = r.pattern.replace(/\/+$/, "") + suffix;
    const matcher = new UrlPattern(normPatt);
    checkNamesUniq(matcher.names);
    map[r.routeId] = matcher;

    if (r.children) {
      for (let k in r.children) {
        if (r.children[k] && r.children[k].routeId) {
          children[r.routeId] = r.children[k].routeId;
          parents[r.children[k].routeId] = r.routeId;
        }
      }
    }
  });

  // Define routes tree and set it to each command
  const roots = routes.filter(r => !parents[r.routeId]);
  const routesTree = { map, children, parents, roots };
  routes.forEach(r => r.routes = routesTree);
  return routesTree;
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

export const isFirstAppear = (model, routeCmd) =>
  model.appearedOnce[routeCmd.routeId];

export const isChanged = (model, routeCmd) =>
  model.changedRoutes[routeCmd.routeId];

export const isActive = (model, routeCmd) =>
  model.active[routeCmd.routeId];

export const isLeft = (model, routeCmd) =>
  model.leftRoutes[routeCmd.routeId];

export const isNotFound = (model) =>
  Object.keys(model.active).length === 0;
