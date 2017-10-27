/**
 * Returns a Process ogject of given model object.
 * If process is not defined it throw an issue.
 * @param  {Object} model
 * @return {Process}
 */
function procOf(model, ignoreError) {
  const proc = model && model.__proc;
  if (!proc && !ignoreError) {
    throw new Error("Process is not defined");
  }
  return proc;
}

export default procOf;
