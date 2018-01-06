/**
 * Get a {@link Process} instance attached to the given model object.
 * Internally it get a `__proc` field from the given model and returns it.
 *
 * If given model do not have attached Process, then an Error will be throwed,
 * but only if the second argument is not true, which ignores the error.
 *
 * @param  {Object} model  A model with attached {@link Process}
 * @param {bool} ignoreError  If true then no error will be throwed if Process
 *                            is not attached to the model
 * @return {Process}  An instance of {@link Process} attached to the model
 */
function procOf(model, ignoreError) {
  const proc = model && model.__proc;
  if (!proc && !ignoreError) {
    throw new Error('Process is not defined in the model');
  }
  return proc;
}

export default procOf;
