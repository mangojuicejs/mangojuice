import DependsDef from '../../classes/DependsDef';


/**
 * Returns an object which describes compute function
 * and its dependencies to track changes.
 * @param  {...object} deps  list of models with attached logic
 * @return {object}
 */
export function depends(...deps) {
  return new DependsDef(deps)
}

export default depends;
