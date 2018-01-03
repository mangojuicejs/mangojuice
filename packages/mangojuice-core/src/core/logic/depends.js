import ComputedField from '../../classes/ComputedField';

/**
 * Returns an object which describes compute function
 * and its dependencies to track changes.
 * @param  {...object} deps  list of models with attached logic
 * @return {object}
 */
export function depends(...deps) {
  return new ComputedField(deps);
}

export default depends;
