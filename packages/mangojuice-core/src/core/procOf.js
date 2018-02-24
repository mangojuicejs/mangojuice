import { is } from './utils';


/**
 * Get a {@link Process} instance attached to the given model object.
 * Internally it get a `__proc` field from the given model and returns it.
 *
 * If given model do not have attached Process, then an Error will be throwed,
 * but only if the second argument is not true, which ignores the error.
 *
 * @param  {Object} model  A model with attached {@link Process}
 * @return {Process}  An instance of {@link Process} attached to the model
 */
function procOf(model) {
  return model && model.__proc;
}

export default procOf;
