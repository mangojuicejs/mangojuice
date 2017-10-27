import procOf from './procOf';


/**
 * Returns a Process ogject of given model object.
 * If process is not defined it throw an issue.
 * @param  {Object} model
 * @return {Process}
 */
function logicOf(model, ignoreError) {
  const proc = procOf(model, ignoreError);
  return proc && proc.logic;
}

export default logicOf;
